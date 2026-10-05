using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.JMSFusionV2.Controllers;

[ApiController]
[Route("JMSFusionV2/ping")]
[Route("Plugins/JMSFusionV2/ping")]
public class PingController : ControllerBase
{
    [HttpGet]
    public IActionResult Ping()
    {
        Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0";
        Response.Headers["Pragma"] = "no-cache";
        Response.Headers["Expires"] = "0";
        Response.Headers["X-JMSFusionV2-Version"] = AssetVersioning.AssetVersion;
        return NoContent();
    }
}
