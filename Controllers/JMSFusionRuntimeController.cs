using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.IO;

namespace Jellyfin.Plugin.JMSFusionV2.Controllers
{
    [ApiController]
    [Route("JMSFusionV2/runtime")]
    [Route("Plugins/JMSFusionV2/runtime")]
    public class JMSFusionV2RuntimeController : ControllerBase
    {
        private static readonly IReadOnlyDictionary<string, string> ScriptResourceMap =
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["auth"] = "RuntimeModules.auth.js",
                ["api"] = "RuntimeModules.api.js",
                ["storage-preload"] = "RuntimeModules.storagePreload.js"
            };

        private readonly ILogger<JMSFusionV2RuntimeController> _logger;

        public JMSFusionV2RuntimeController(ILogger<JMSFusionV2RuntimeController> logger)
        {
            _logger = logger;
        }

        [HttpGet("{name}.js")]
        public IActionResult GetScript(string name)
        {
            if (!ScriptResourceMap.TryGetValue(name, out var resourceSuffix))
            {
                return NotFound();
            }

            try
            {
                if (AssetVersioning.TryHandleConditionalGet(HttpContext, $"runtime:{name}"))
                {
                    return StatusCode(304);
                }

                var asm = typeof(JMSFusionV2Plugin).Assembly;
                var ns = typeof(JMSFusionV2Plugin).Namespace;
                var resourceName = $"{ns}.{resourceSuffix}";

                using var stream = asm.GetManifestResourceStream(resourceName);
                if (stream == null)
                {
                    _logger.LogWarning("Runtime script resource not found: {ResourceName}", resourceName);
                    return NotFound();
                }

                using var ms = new MemoryStream();
                stream.CopyTo(ms);

                return File(ms.ToArray(), "application/javascript; charset=utf-8");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to serve runtime script: {ScriptName}", name);
                return StatusCode(500, "Internal server error");
            }
        }
    }
}
