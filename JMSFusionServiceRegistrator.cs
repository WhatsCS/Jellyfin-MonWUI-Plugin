using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Jellyfin.Plugin.JMSFusionV2.Core;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Hosting;

namespace Jellyfin.Plugin.JMSFusionV2
{
    public sealed class JMSFusionV2ServiceRegistrator : IPluginServiceRegistrator
    {
        public void RegisterServices(IServiceCollection services, IServerApplicationHost applicationHost)
        {
            services.AddSingleton<TrailerAutomationService>();
            services.AddSingleton<CinemaPreRollCacheService>();
            services.AddSingleton<ScopedCacheJsonService>();
            services.AddTransient<IStartupFilter, JMSStartupFilter>();
        }
    }
}
