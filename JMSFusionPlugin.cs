using System;
using System.Collections;
using System.IO;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using System.Collections.Generic;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using Microsoft.Extensions.Logging;
using Jellyfin.Plugin.JMSFusionV2.Core;

namespace Jellyfin.Plugin.JMSFusionV2
{
    public class JMSFusionV2Plugin : BasePlugin<JMSFusionV2Configuration>, IHasWebPages
    {
        public override string Name => "JMSFusionV2";
        public override Guid Id => Guid.Parse("c0b4a5e0-2f6a-4e70-9c5f-1e7c2d0b7f12");
        public override string Description => "Inject custom JS into Jellyfin UI via in-memory transformation, middleware fallback, or index.html patch.";

        private readonly ILogger<JMSFusionV2Plugin> _logger;
        private readonly IApplicationPaths _paths;
        private bool _lastPhysicalPatchFallbackEnabled;
        public static JMSFusionV2Plugin Instance { get; private set; } = null!;

        public JMSFusionV2Plugin(IApplicationPaths paths, IXmlSerializer xmlSerializer, ILoggerFactory loggerFactory)
            : base(paths, xmlSerializer)
        {
            _logger = loggerFactory.CreateLogger<JMSFusionV2Plugin>();
            _paths = paths;
            Instance = this;
            _lastPhysicalPatchFallbackEnabled = Configuration.EnablePhysicalIndexHtmlPatchFallback;

            ConfigurationChanged += (_, __) =>
            {
                _logger.LogInformation("[JMSFusionV2] Configuration changed.");
                JMSStartupFilter.InvalidateIndexHtmlCache();
                var fallbackEnabled = Configuration.EnablePhysicalIndexHtmlPatchFallback;

                if (fallbackEnabled)
                {
                    TryPatchIndexHtml();
                }
                else if (_lastPhysicalPatchFallbackEnabled)
                {
                    TryUnpatchIndexHtml();
                }

                _lastPhysicalPatchFallbackEnabled = fallbackEnabled;
            };

            if (_lastPhysicalPatchFallbackEnabled)
            {
                TryPatchIndexHtml();

                _ = Task.Run(async () =>
                {
                    for (var i = 0; i < 3; i++)
                    {
                        await Task.Delay(TimeSpan.FromSeconds(3 * (i + 1)));
                        if (!Configuration.EnablePhysicalIndexHtmlPatchFallback)
                        {
                            break;
                        }

                        TryPatchIndexHtml();
                    }
                });
            }

            try
            {
                if (Configuration.EnableTransformEngine)
                {
                    ResponseTransformation.Register(@".*index\.html(\.gz|\.br)?$",
                        req =>
                        {
                            var html = req.Contents ?? string.Empty;

                            _logger.LogInformation(
                                "[JMSFusionV2][DIAG] Transform hit for {Path} (len={Len})",
                                req.FilePath, html.Length
                            );

                            if (html.IndexOf("<!-- SL-INJECT BEGIN -->", StringComparison.OrdinalIgnoreCase) >= 0)
                                return html;

                            var snippet = BuildScriptsHtml();
                            var headEndIndex = html.IndexOf("</head>", StringComparison.OrdinalIgnoreCase);
                            if (headEndIndex >= 0)
                            {
                                return html.Insert(headEndIndex, "\n" + snippet + "\n");
                            }

                            return html + "\n" + snippet + "\n";
                        });

                    _logger.LogInformation("[JMSFusionV2] Registered in-memory transformation rule for .*index.html(+gz/br)");
                }
                else
                {
                    _logger.LogInformation("[JMSFusionV2] Transform engine disabled by configuration");
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[JMSFusionV2] Failed to register in-memory transformation; middleware/patch fallback will be used.");
            }
        }

        public override void OnUninstalling()
        {
            _logger.LogInformation("[JMSFusionV2] Plugin uninstall detected. Cleaning physical index.html patch if present.");
            TryUnpatchIndexHtml();
            base.OnUninstalling();
        }

        public override void UpdateConfiguration(BasePluginConfiguration configuration)
        {
            if (configuration is JMSFusionV2Configuration incoming &&
                Configuration != null &&
                !ReferenceEquals(incoming, Configuration))
            {
                PreserveExistingValuesForPartialUpdate(incoming, Configuration);
            }

            base.UpdateConfiguration(configuration);
        }

        private static void PreserveExistingValuesForPartialUpdate(
            JMSFusionV2Configuration incoming,
            JMSFusionV2Configuration existing)
        {
            var defaults = new JMSFusionV2Configuration();
            var properties = typeof(JMSFusionV2Configuration).GetProperties(BindingFlags.Instance | BindingFlags.Public);

            foreach (var property in properties)
            {
                if (!property.CanRead ||
                    !property.CanWrite ||
                    property.GetIndexParameters().Length > 0)
                {
                    continue;
                }

                var incomingValue = property.GetValue(incoming);
                var existingValue = property.GetValue(existing);
                var defaultValue = property.GetValue(defaults);

                if (IsDefaultValue(incomingValue, defaultValue) &&
                    !IsDefaultValue(existingValue, defaultValue))
                {
                    property.SetValue(incoming, existingValue);
                }
            }
        }

        private static bool IsDefaultValue(object? value, object? defaultValue)
        {
            if (value is null || defaultValue is null)
            {
                return value is null && defaultValue is null;
            }

            if (value is string || defaultValue is string)
            {
                return string.Equals(value as string, defaultValue as string, StringComparison.Ordinal);
            }

            if (value is ICollection valueCollection && defaultValue is ICollection defaultCollection)
            {
                return defaultCollection.Count == 0 && valueCollection.Count == 0;
            }

            return Equals(value, defaultValue);
        }

        private string? DetectWebRoot()
        {
            try
            {
                var webPath = ApplicationPaths.WebPath;
                if (!string.IsNullOrWhiteSpace(webPath) &&
                    Directory.Exists(webPath) &&
                    File.Exists(Path.Combine(webPath, "index.html")))
                {
                    _logger.LogInformation("[JMSFusionV2] Using ApplicationPaths.WebPath as web root: {WebRoot}", webPath);
                    return webPath;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[JMSFusionV2] Failed probing ApplicationPaths.WebPath");
            }

            var candidates = new[]
            {
                "/usr/share/jellyfin/web",
                "/var/lib/jellyfin/web",
                "/opt/jellyfin/web",
                "/jellyfin/web",
                Path.Combine(Environment.CurrentDirectory, "web"),
                Path.Combine(AppContext.BaseDirectory, "web")
            };

            foreach (var p in candidates)
            {
                try
                {
                    _logger.LogInformation("[JMSFusionV2] Checking web root candidate: {Candidate}", p);

                    if (Directory.Exists(p) && File.Exists(Path.Combine(p, "index.html")))
                    {
                        _logger.LogInformation("[JMSFusionV2] Found web root: {WebRoot}", p);
                        return p;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[JMSFusionV2] Error checking candidate: {Candidate}", p);
                }
            }

            _logger.LogWarning("[JMSFusionV2] Web root not found in any candidate location");
            return null;
        }

        public void TryPatchIndexHtml()
        {
            try
            {
                var root = DetectWebRoot();
                if (string.IsNullOrWhiteSpace(root))
                {
                    _logger.LogWarning("[JMSFusionV2] Web root not found; skipping patch.");
                    return;
                }

                var ok = IndexPatcher.EnsurePatched(_logger, root);
                _logger.LogInformation("[JMSFusionV2] Patch result: {ok}", ok);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[JMSFusionV2] TryPatchIndexHtml failed");
            }
        }

        public void TryUnpatchIndexHtml()
        {
            try
            {
                var root = DetectWebRoot();
                if (string.IsNullOrWhiteSpace(root))
                {
                    _logger.LogWarning("[JMSFusionV2] Web root not found; skipping unpatch.");
                    return;
                }

                var ok = IndexPatcher.EnsureUnpatched(_logger, root);
                _logger.LogInformation("[JMSFusionV2] Unpatch result: {ok}", ok);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[JMSFusionV2] TryUnpatchIndexHtml failed");
            }
        }

        public string BuildScriptsHtml(string? pathBase = null)
        {
            var sb = new StringBuilder();
            sb.AppendLine("<!-- SL-INJECT BEGIN -->");
            sb.AppendLine(AssetVersioning.BuildBootstrapScript());
            sb.AppendLine($@"<script type=""module"" src=""{AssetVersioning.AppendVersionQuery("../slider/dist/storage-preload.js")}""></script>");
            sb.AppendLine($@"<script type=""module"" src=""{AssetVersioning.AppendVersionQuery("../slider/dist/main.js")}""></script>");
            sb.AppendLine($@"<script type=""module"" src=""{AssetVersioning.AppendVersionQuery("../slider/dist/player.js")}""></script>");
            sb.AppendLine("<!-- SL-INJECT END -->");
            return sb.ToString();
        }

        public IEnumerable<PluginPageInfo> GetPages()
        {
            var ns = typeof(JMSFusionV2Plugin).Namespace;
            return new[]
            {
                new PluginPageInfo
                {
                    Name = "JMSFusionV2ConfigPage",
                    DisplayName = "JMSFusionV2",
                    EmbeddedResourcePath = $"{ns}.Web.configuration.html",
                    EnableInMainMenu = true,
                    MenuSection = "server",
                    MenuIcon = "extension"
                }
            };
        }

        public string GetStorageDirectory(params string[] segments)
        {
            var basePath =
                ReadPathValue(_paths, "PluginConfigurationsPath") ??
                ReadPathValue(_paths, "ProgramDataPath") ??
                ReadPathValue(_paths, "DataPath") ??
                Path.GetDirectoryName(ReadPathValue(this, "ConfigurationPath") ?? string.Empty) ??
                AppContext.BaseDirectory;

            var current = Path.Combine(basePath, "JMSFusionV2");
            Directory.CreateDirectory(current);

            foreach (var segment in segments ?? Array.Empty<string>())
            {
                var cleanSegment = string.IsNullOrWhiteSpace(segment)
                    ? string.Empty
                    : segment.Trim().Trim(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
                if (string.IsNullOrWhiteSpace(cleanSegment))
                {
                    continue;
                }

                current = Path.Combine(current, cleanSegment);
                Directory.CreateDirectory(current);
            }

            return current;
        }

        private static string? ReadPathValue(object? source, string propertyName)
        {
            try
            {
                return source?.GetType().GetProperty(propertyName)?.GetValue(source) as string;
            }
            catch
            {
                return null;
            }
        }
    }
}
