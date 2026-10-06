using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Concurrent;
using System.IO;

namespace Jellyfin.Plugin.JMSFusionV2.Controllers
{
    [ApiController]
    [Route("Plugins/JMSFusionV2/assets")]
    public class JMSFusionV2AssetsController : ControllerBase
    {
        private static readonly ConcurrentDictionary<string, byte[]> EmbeddedJavascript =
            new(StringComparer.OrdinalIgnoreCase);

        private readonly ILogger<JMSFusionV2AssetsController> _logger;
        public JMSFusionV2AssetsController(ILogger<JMSFusionV2AssetsController> logger) => _logger = logger;

        [HttpGet("UiJs")]
        public IActionResult GetUiJs() => ServeEmbeddedJavascript("assets:ui-js", "ui.js", "UiJs error");

        [HttpGet("WebSettingsJs")]
        public IActionResult GetWebSettingsJs() => ServeEmbeddedJavascript("assets:web-settings-js", "settings.js", "WebSettingsJs error");

        private IActionResult ServeEmbeddedJavascript(string cacheKey, string fileName, string errorLogMessage)
        {
            try
            {
                if (AssetVersioning.TryHandleConditionalGet(HttpContext, cacheKey))
                {
                    return StatusCode(304);
                }

                if (!EmbeddedJavascript.TryGetValue(fileName, out var payload))
                {
                    var asm = typeof(JMSFusionV2Plugin).Assembly;
                    var ns = typeof(JMSFusionV2Plugin).Namespace;
                    var resName = $"{ns}.Web.{fileName}";

                    using var stream = asm.GetManifestResourceStream(resName);
                    if (stream == null) return NotFound();

                    using var ms = new MemoryStream();
                    stream.CopyTo(ms);
                    payload = EmbeddedJavascript.GetOrAdd(fileName, ms.ToArray());
                }

                return File(payload, "application/javascript; charset=utf-8");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, errorLogMessage);
                return StatusCode(500, "Internal server error");
            }
        }
    }
}
