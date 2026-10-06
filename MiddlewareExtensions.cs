using Microsoft.AspNetCore.Builder;

namespace Jellyfin.Plugin.JMSFusionV2
{
    public static class MiddlewareExtensions
    {
        public static IApplicationBuilder UseJMSFusionV2(this IApplicationBuilder app) => app;
    }
}
