define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.optionsPlugin = exports.addCustomPlugin = exports.activePlugins = exports.allowConnectingToLocalhost = void 0;
    const pluginRegistry = [
        {
            module: "typescript-playground-presentation-mode",
            display: "Presentation Mode",
            blurb: "Create presentations inside the TypeScript playground, seamlessly jump between slides and live-code.",
            repo: "https://github.com/orta/playground-slides/#readme",
            author: {
                name: "Orta",
                href: "https://orta.io",
            },
        },
        {
            module: "playground-collaborate",
            display: "Collaborate",
            blurb: "Create rooms to inspect code together.",
            repo: "https://github.com/orta/playground-collaborate/#readme",
            author: {
                name: "Orta",
                href: "https://orta.io",
            },
        },
        {
            module: "playground-transformer-timeline",
            display: "Transformer Timeline",
            blurb: "Shows the transpilation steps as your code migrates from TS -> JS.",
            repo: "https://github.com/orta/playground-transformer-timeline#typescript-transformers-playground-plugin",
            author: {
                name: "Orta",
                href: "https://orta.io",
            },
        },
    ];
    /** Whether the playground should actively reach out to an existing plugin */
    exports.allowConnectingToLocalhost = () => {
        return !!localStorage.getItem("compiler-setting-connect-dev-plugin");
    };
    exports.activePlugins = () => {
        const existing = customPlugins().map(module => ({ module }));
        return existing.concat(pluginRegistry.filter(p => !!localStorage.getItem("plugin-" + p.module)));
    };
    const removeCustomPlugins = (mod) => {
        const newPlugins = customPlugins().filter(p => p !== mod);
        localStorage.setItem("custom-plugins-playground", JSON.stringify(newPlugins));
    };
    exports.addCustomPlugin = (mod) => {
        const newPlugins = customPlugins();
        newPlugins.push(mod);
        localStorage.setItem("custom-plugins-playground", JSON.stringify(newPlugins));
        // @ts-ignore
        window.appInsights &&
            // @ts-ignore
            window.appInsights.trackEvent({ name: "Added Custom Module", properties: { id: mod } });
    };
    const customPlugins = () => {
        return JSON.parse(localStorage.getItem("custom-plugins-playground") || "[]");
    };
    exports.optionsPlugin = (i, utils) => {
        const plugin = {
            id: "plugins",
            displayName: i("play_sidebar_plugins"),
            // shouldBeSelected: () => true, // uncomment to make this the first tab on reloads
            willMount: (_sandbox, container) => {
                const ds = utils.createDesignSystem(container);
                ds.subtitle(i("play_sidebar_plugins_options_external"));
                const pluginsOL = document.createElement("ol");
                pluginsOL.className = "playground-plugins";
                pluginRegistry.forEach(plugin => {
                    const settingButton = createPlugin(plugin);
                    pluginsOL.appendChild(settingButton);
                });
                container.appendChild(pluginsOL);
                const warning = document.createElement("p");
                warning.className = "warning";
                warning.textContent = i("play_sidebar_plugins_options_external_warning");
                container.appendChild(warning);
                const subheading = ds.subtitle(i("play_sidebar_plugins_options_modules"));
                subheading.id = "custom-modules-header";
                const customModulesOL = document.createElement("ol");
                customModulesOL.className = "custom-modules";
                const updateCustomModules = () => {
                    while (customModulesOL.firstChild) {
                        customModulesOL.removeChild(customModulesOL.firstChild);
                    }
                    customPlugins().forEach(module => {
                        const li = document.createElement("li");
                        li.innerHTML = module;
                        const a = document.createElement("a");
                        a.href = "#";
                        a.textContent = "X";
                        a.onclick = () => {
                            removeCustomPlugins(module);
                            updateCustomModules();
                            ds.declareRestartRequired(i);
                            return false;
                        };
                        li.appendChild(a);
                        customModulesOL.appendChild(li);
                    });
                };
                updateCustomModules();
                container.appendChild(customModulesOL);
                const inputForm = createNewModuleInputForm(updateCustomModules, i);
                container.appendChild(inputForm);
                ds.subtitle(i("play_sidebar_plugins_plugin_dev"));
                const pluginsDevOL = document.createElement("ol");
                pluginsDevOL.className = "playground-options";
                const connectToDev = ds.localStorageOption({
                    display: i("play_sidebar_plugins_plugin_dev_option"),
                    blurb: i("play_sidebar_plugins_plugin_dev_copy"),
                    flag: "compiler-setting-connect-dev-plugin",
                    onchange: () => {
                        ds.declareRestartRequired(i);
                    },
                });
                pluginsDevOL.appendChild(connectToDev);
                container.appendChild(pluginsDevOL);
            },
        };
        const createPlugin = (plugin) => {
            const li = document.createElement("li");
            const div = document.createElement("div");
            const label = document.createElement("label");
            const top = `<span>${plugin.display}</span> by <a href='${plugin.author.href}'>${plugin.author.name}</a><br/>${plugin.blurb}`;
            const bottom = `<a href='https://www.npmjs.com/package/${plugin.module}'>npm</a> | <a href="${plugin.repo}">repo</a>`;
            label.innerHTML = `${top}<br/>${bottom}`;
            const key = "plugin-" + plugin.module;
            const input = document.createElement("input");
            input.type = "checkbox";
            input.id = key;
            input.checked = !!localStorage.getItem(key);
            input.onchange = () => {
                const ds = utils.createDesignSystem(div);
                ds.declareRestartRequired(i);
                if (input.checked) {
                    // @ts-ignore
                    window.appInsights &&
                        // @ts-ignore
                        window.appInsights.trackEvent({ name: "Added Registry Plugin", properties: { id: key } });
                    localStorage.setItem(key, "true");
                }
                else {
                    localStorage.removeItem(key);
                }
            };
            label.htmlFor = input.id;
            div.appendChild(input);
            div.appendChild(label);
            li.appendChild(div);
            return li;
        };
        const createNewModuleInputForm = (updateOL, i) => {
            const form = document.createElement("form");
            const newModuleInput = document.createElement("input");
            newModuleInput.type = "text";
            newModuleInput.placeholder = i("play_sidebar_plugins_options_modules_placeholder");
            newModuleInput.setAttribute("aria-labelledby", "custom-modules-header");
            form.appendChild(newModuleInput);
            form.onsubmit = e => {
                const ds = utils.createDesignSystem(form);
                ds.declareRestartRequired(i);
                exports.addCustomPlugin(newModuleInput.value);
                e.stopPropagation();
                updateOL();
                return false;
            };
            return form;
        };
        return plugin;
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGx1Z2lucy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3BsYXlncm91bmQvc3JjL3NpZGViYXIvcGx1Z2lucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0lBRUEsTUFBTSxjQUFjLEdBQUc7UUFDckI7WUFDRSxNQUFNLEVBQUUseUNBQXlDO1lBQ2pELE9BQU8sRUFBRSxtQkFBbUI7WUFDNUIsS0FBSyxFQUFFLHNHQUFzRztZQUM3RyxJQUFJLEVBQUUsbURBQW1EO1lBQ3pELE1BQU0sRUFBRTtnQkFDTixJQUFJLEVBQUUsTUFBTTtnQkFDWixJQUFJLEVBQUUsaUJBQWlCO2FBQ3hCO1NBQ0Y7UUFDRDtZQUNFLE1BQU0sRUFBRSx3QkFBd0I7WUFDaEMsT0FBTyxFQUFFLGFBQWE7WUFDdEIsS0FBSyxFQUFFLHdDQUF3QztZQUMvQyxJQUFJLEVBQUUsd0RBQXdEO1lBQzlELE1BQU0sRUFBRTtnQkFDTixJQUFJLEVBQUUsTUFBTTtnQkFDWixJQUFJLEVBQUUsaUJBQWlCO2FBQ3hCO1NBQ0Y7UUFDRDtZQUNFLE1BQU0sRUFBRSxpQ0FBaUM7WUFDekMsT0FBTyxFQUFFLHNCQUFzQjtZQUMvQixLQUFLLEVBQUUsb0VBQW9FO1lBQzNFLElBQUksRUFBRSxtR0FBbUc7WUFDekcsTUFBTSxFQUFFO2dCQUNOLElBQUksRUFBRSxNQUFNO2dCQUNaLElBQUksRUFBRSxpQkFBaUI7YUFDeEI7U0FDRjtLQUNGLENBQUE7SUFFRCw2RUFBNkU7SUFDaEUsUUFBQSwwQkFBMEIsR0FBRyxHQUFHLEVBQUU7UUFDN0MsT0FBTyxDQUFDLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFBO0lBQ3RFLENBQUMsQ0FBQTtJQUVZLFFBQUEsYUFBYSxHQUFHLEdBQUcsRUFBRTtRQUNoQyxNQUFNLFFBQVEsR0FBRyxhQUFhLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxF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cnkgfSBmcm9tIFwiLi5cIlxuXG5jb25zdCBwbHVnaW5SZWdpc3RyeSA9IFtcbiAge1xuICAgIG1vZHVsZTogXCJ0eXBlc2NyaXB0LXBsYXlncm91bmQtcHJlc2VudGF0aW9uLW1vZGVcIixcbiAgICBkaXNwbGF5OiBcIlByZXNlbnRhdGlvbiBNb2RlXCIsXG4gICAgYmx1cmI6IFwiQ3JlYXRlIHByZXNlbnRhdGlvbnMgaW5zaWRlIHRoZSBUeXBlU2NyaXB0IHBsYXlncm91bmQsIHNlYW1sZXNzbHkganVtcCBiZXR3ZWVuIHNsaWRlcyBhbmQgbGl2ZS1jb2RlLlwiLFxuICAgIHJlcG86IFwiaHR0cHM6Ly9naXRodWIuY29tL29ydGEvcGxheWdyb3VuZC1zbGlkZXMvI3JlYWRtZVwiLFxuICAgIGF1dGhvcjoge1xuICAgICAgbmFtZTogXCJPcnRhXCIsXG4gICAgICBocmVmOiBcImh0dHBzOi8vb3J0YS5pb1wiLFxuICAgIH0sXG4gIH0sXG4gIHtcbiAgICBtb2R1bGU6IFwicGxheWdyb3VuZC1jb2xsYWJvcmF0ZVwiLFxuICAgIGRpc3BsYXk6IFwiQ29sbGFib3JhdGVcIixcbiAgICBibHVyYjogXCJDcmVhdGUgcm9vbXMgdG8gaW5zcGVjdCBjb2RlIHRvZ2V0aGVyLlwiLFxuICAgIHJlcG86IFwiaHR0cHM6Ly9naXRodWIuY29tL29ydGEvcGxheWdyb3VuZC1jb2xsYWJvcmF0ZS8jcmVhZG1lXCIsXG4gICAgYXV0aG9yOiB7XG4gICAgICBuYW1lOiBcIk9ydGFcIixcbiAgICAgIGhyZWY6IFwiaHR0cHM6Ly9vcnRhLmlvXCIsXG4gICAgfSxcbiAgfSxcbiAge1xuICAgIG1vZHVsZTogXCJwbGF5Z3JvdW5kLXRyYW5zZm9ybWVyLXRpbWVsaW5lXCIsXG4gICAgZGlzcGxheTogXCJUcmFuc2Zvcm1lciBUaW1lbGluZVwiLFxuICAgIGJsdXJiOiBcIlNob3dzIHRoZSB0cmFuc3BpbGF0aW9uIHN0ZXBzIGFzIHlvdXIgY29kZSBtaWdyYXRlcyBmcm9tIFRTIC0+IEpTLlwiLFxuICAgIHJlcG86IFwiaHR0cHM6Ly9naXRodWIuY29tL29ydGEvcGxheWdyb3VuZC10cmFuc2Zvcm1lci10aW1lbGluZSN0eXBlc2NyaXB0LXRyYW5zZm9ybWVycy1wbGF5Z3JvdW5kLXBsdWdpblwiLFxuICAgIGF1dGhvcjoge1xuICAgICAgbmFtZTogXCJPcnRhXCIsXG4gICAgICBocmVmOiBcImh0dHBzOi8vb3J0YS5pb1wiLFxuICAgIH0sXG4gIH0sXG5dXG5cbi8qKiBXaGV0aGVyIHRoZSBwbGF5Z3JvdW5kIHNob3VsZCBhY3RpdmVseSByZWFjaCBvdXQgdG8gYW4gZXhpc3RpbmcgcGx1Z2luICovXG5leHBvcnQgY29uc3QgYWxsb3dDb25uZWN0aW5nVG9Mb2NhbGhvc3QgPSAoKSA9PiB7XG4gIHJldHVybiAhIWxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiY29tcGlsZXItc2V0dGluZy1jb25uZWN0LWRldi1wbHVnaW5cIilcbn1cblxuZXhwb3J0IGNvbnN0IGFjdGl2ZVBsdWdpbnMgPSAoKSA9PiB7XG4gIGNvbnN0IGV4aXN0aW5nID0gY3VzdG9tUGx1Z2lucygpLm1hcChtb2R1bGUgPT4gKHsgbW9kdWxlIH0pKVxuICByZXR1cm4gZXhpc3RpbmcuY29uY2F0KHBsdWdpblJlZ2lzdHJ5LmZpbHRlcihwID0+ICEhbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJwbHVnaW4tXCIgKyBwLm1vZHVsZSkpKVxufVxuXG5jb25zdCByZW1vdmVDdXN0b21QbHVnaW5zID0gKG1vZDogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IG5ld1BsdWdpbnMgPSBjdXN0b21QbHVnaW5zKCkuZmlsdGVyKHAgPT4gcCAhPT0gbW9kKVxuICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcImN1c3RvbS1wbHVnaW5zLXBsYXlncm91bmRcIiwgSlNPTi5zdHJpbmdpZnkobmV3UGx1Z2lucykpXG59XG5cbmV4cG9ydCBjb25zdCBhZGRDdXN0b21QbHVnaW4gPSAobW9kOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgbmV3UGx1Z2lucyA9IGN1c3RvbVBsdWdpbnMoKVxuICBuZXdQbHVnaW5zLnB1c2gobW9kKVxuICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcImN1c3RvbS1wbHVnaW5zLXBsYXlncm91bmRcIiwgSlNPTi5zdHJpbmdpZnkobmV3UGx1Z2lucykpXG4gIC8vIEB0cy1pZ25vcmVcbiAgd2luZG93LmFwcEluc2lnaHRzICYmXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHdpbmRvdy5hcHBJbnNpZ2h0cy50cmFja0V2ZW50KHsgbmFtZTogXCJBZGRlZCBDdXN0b20gTW9kdWxlXCIsIHByb3BlcnRpZXM6IHsgaWQ6IG1vZCB9IH0pXG59XG5cbmNvbnN0IGN1c3RvbVBsdWdpbnMgPSAoKTogc3RyaW5nW10gPT4ge1xuICByZXR1cm4gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImN1c3RvbS1wbHVnaW5zLXBsYXlncm91bmRcIikgfHwgXCJbXVwiKVxufVxuXG5leHBvcnQgY29uc3Qgb3B0aW9uc1BsdWdpbjogUGx1Z2luRmFjdG9yeSA9IChpLCB1dGlscykgPT4ge1xuICBjb25zdCBwbHVnaW46IFBsYXlncm91bmRQbHVnaW4gPSB7XG4gICAgaWQ6IFwicGx1Z2luc1wiLFxuICAgIGRpc3BsYXlOYW1lOiBpKFwicGxheV9zaWRlYmFyX3BsdWdpbnNcIiksXG4gICAgLy8gc2hvdWxkQmVTZWxlY3RlZDogKCkgPT4gdHJ1ZSwgLy8gdW5jb21tZW50IHRvIG1ha2UgdGhpcyB0aGUgZmlyc3QgdGFiIG9uIHJlbG9hZHNcbiAgICB3aWxsTW91bnQ6IChfc2FuZGJveCwgY29udGFpbmVyKSA9PiB7XG4gICAgICBjb25zdCBkcyA9IHV0aWxzLmNyZWF0ZURlc2lnblN5c3RlbShjb250YWluZXIpXG5cbiAgICAgIGRzLnN1YnRpdGxlKGkoXCJwbGF5X3NpZGViYXJfcGx1Z2luc19vcHRpb25zX2V4dGVybmFsXCIpKVxuXG4gICAgICBjb25zdCBwbHVnaW5zT0wgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwib2xcIilcbiAgICAgIHBsdWdpbnNPTC5jbGFzc05hbWUgPSBcInBsYXlncm91bmQtcGx1Z2luc1wiXG4gICAgICBwbHVnaW5SZWdpc3RyeS5mb3JFYWNoKHBsdWdpbiA9PiB7XG4gICAgICAgIGNvbnN0IHNldHRpbmdCdXR0b24gPSBjcmVhdGVQbHVnaW4ocGx1Z2luKVxuICAgICAgICBwbHVnaW5zT0wuYXBwZW5kQ2hpbGQoc2V0dGluZ0J1dHRvbilcbiAgICAgIH0pXG4gICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQocGx1Z2luc09MKVxuXG4gICAgICBjb25zdCB3YXJuaW5nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInBcIilcbiAgICAgIHdhcm5pbmcuY2xhc3NOYW1lID0gXCJ3YXJuaW5nXCJcbiAgICAgIHdhcm5pbmcudGV4dENvbnRlbnQgPSBpKFwicGxheV9zaWRlYmFyX3BsdWdpbnNfb3B0aW9uc19leHRlcm5hbF93YXJuaW5nXCIpXG4gICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQod2FybmluZylcblxuICAgICAgY29uc3Qgc3ViaGVhZGluZyA9IGRzLnN1YnRpdGxlKGkoXCJwbGF5X3NpZGViYXJfcGx1Z2luc19vcHRpb25zX21vZHVsZXNcIikpXG4gICAgICBzdWJoZWFkaW5nLmlkID0gXCJjdXN0b20tbW9kdWxlcy1oZWFkZXJcIlxuXG4gICAgICBjb25zdCBjdXN0b21Nb2R1bGVzT0wgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwib2xcIilcbiAgICAgIGN1c3RvbU1vZHVsZXNPTC5jbGFzc05hbWUgPSBcImN1c3RvbS1tb2R1bGVzXCJcblxuICAgICAgY29uc3QgdXBkYXRlQ3VzdG9tTW9kdWxlcyA9ICgpID0+IHtcbiAgICAgICAgd2hpbGUgKGN1c3RvbU1vZHVsZXNPTC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgY3VzdG9tTW9kdWxlc09MLnJlbW92ZUNoaWxkKGN1c3RvbU1vZHVsZXNPTC5maXJzdENoaWxkKVxuICAgICAgICB9XG4gICAgICAgIGN1c3RvbVBsdWdpbnMoKS5mb3JFYWNoKG1vZHVsZSA9PiB7XG4gICAgICAgICAgY29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlcIilcbiAgICAgICAgICBsaS5pbm5lckhUTUwgPSBtb2R1bGVcbiAgICAgICAgICBjb25zdCBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIilcbiAgICAgICAgICBhLmhyZWYgPSBcIiNcIlxuICAgICAgICAgIGEudGV4dENvbnRlbnQgPSBcIlhcIlxuICAgICAgICAgIGEub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgIHJlbW92ZUN1c3RvbVBsdWdpbnMobW9kdWxlKVxuICAgICAgICAgICAgdXBkYXRlQ3VzdG9tTW9kdWxlcygpXG4gICAgICAgICAgICBkcy5kZWNsYXJlUmVzdGFydFJlcXVpcmVkKGkpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgICAgbGkuYXBwZW5kQ2hpbGQoYSlcblxuICAgICAgICAgIGN1c3RvbU1vZHVsZXNPTC5hcHBlbmRDaGlsZChsaSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIHVwZGF0ZUN1c3RvbU1vZHVsZXMoKVxuXG4gICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoY3VzdG9tTW9kdWxlc09MKVxuICAgICAgY29uc3QgaW5wdXRGb3JtID0gY3JlYXRlTmV3TW9kdWxlSW5wdXRGb3JtKHVwZGF0ZUN1c3RvbU1vZHVsZXMsIGkpXG4gICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoaW5wdXRGb3JtKVxuXG4gICAgICBkcy5zdWJ0aXRsZShpKFwicGxheV9zaWRlYmFyX3BsdWdpbnNfcGx1Z2luX2RldlwiKSlcblxuICAgICAgY29uc3QgcGx1Z2luc0Rldk9MID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIm9sXCIpXG4gICAgICBwbHVnaW5zRGV2T0wuY2xhc3NOYW1lID0gXCJwbGF5Z3JvdW5kLW9wdGlvbnNcIlxuXG4gICAgICBjb25zdCBjb25uZWN0VG9EZXYgPSBkcy5sb2NhbFN0b3JhZ2VPcHRpb24oe1xuICAgICAgICBkaXNwbGF5OiBpKFwicGxheV9zaWRlYmFyX3BsdWdpbnNfcGx1Z2luX2Rldl9vcHRpb25cIiksXG4gICAgICAgIGJsdXJiOiBpKFwicGxheV9zaWRlYmFyX3BsdWdpbnNfcGx1Z2luX2Rldl9jb3B5XCIpLFxuICAgICAgICBmbGFnOiBcImNvbXBpbGVyLXNldHRpbmctY29ubmVjdC1kZXYtcGx1Z2luXCIsXG4gICAgICAgIG9uY2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgZHMuZGVjbGFyZVJlc3RhcnRSZXF1aXJlZChpKVxuICAgICAgICB9LFxuICAgICAgfSlcblxuICAgICAgcGx1Z2luc0Rldk9MLmFwcGVuZENoaWxkKGNvbm5lY3RUb0RldilcbiAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChwbHVnaW5zRGV2T0wpXG4gICAgfSxcbiAgfVxuXG4gIGNvbnN0IGNyZWF0ZVBsdWdpbiA9IChwbHVnaW46IHR5cGVvZiBwbHVnaW5SZWdpc3RyeVswXSkgPT4ge1xuICAgIGNvbnN0IGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpXCIpXG4gICAgY29uc3QgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuXG4gICAgY29uc3QgbGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGFiZWxcIilcblxuICAgIGNvbnN0IHRvcCA9IGA8c3Bhbj4ke3BsdWdpbi5kaXNwbGF5fTwvc3Bhbj4gYnkgPGEgaHJlZj0nJHtwbHVnaW4uYXV0aG9yLmhyZWZ9Jz4ke3BsdWdpbi5hdXRob3IubmFtZX08L2E+PGJyLz4ke3BsdWdpbi5ibHVyYn1gXG4gICAgY29uc3QgYm90dG9tID0gYDxhIGhyZWY9J2h0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlLyR7cGx1Z2luLm1vZHVsZX0nPm5wbTwvYT4gfCA8YSBocmVmPVwiJHtwbHVnaW4ucmVwb31cIj5yZXBvPC9hPmBcbiAgICBsYWJlbC5pbm5lckhUTUwgPSBgJHt0b3B9PGJyLz4ke2JvdHRvbX1gXG5cbiAgICBjb25zdCBrZXkgPSBcInBsdWdpbi1cIiArIHBsdWdpbi5tb2R1bGVcbiAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKVxuICAgIGlucHV0LnR5cGUgPSBcImNoZWNrYm94XCJcbiAgICBpbnB1dC5pZCA9IGtleVxuICAgIGlucHV0LmNoZWNrZWQgPSAhIWxvY2FsU3RvcmFnZS5nZXRJdGVtKGtleSlcblxuICAgIGlucHV0Lm9uY2hhbmdlID0gKCkgPT4ge1xuICAgICAgY29uc3QgZHMgPSB1dGlscy5jcmVhdGVEZXNpZ25TeXN0ZW0oZGl2KVxuICAgICAgZHMuZGVjbGFyZVJlc3RhcnRSZXF1aXJlZChpKVxuICAgICAgaWYgKGlucHV0LmNoZWNrZWQpIHtcbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICB3aW5kb3cuYXBwSW5zaWdodHMgJiZcbiAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgd2luZG93LmFwcEluc2lnaHRzLnRyYWNrRXZlbnQoeyBuYW1lOiBcIkFkZGVkIFJlZ2lzdHJ5IFBsdWdpblwiLCBwcm9wZXJ0aWVzOiB7IGlkOiBrZXkgfSB9KVxuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShrZXksIFwidHJ1ZVwiKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oa2V5KVxuICAgICAgfVxuICAgIH1cblxuICAgIGxhYmVsLmh0bWxGb3IgPSBpbnB1dC5pZFxuXG4gICAgZGl2LmFwcGVuZENoaWxkKGlucHV0KVxuICAgIGRpdi5hcHBlbmRDaGlsZChsYWJlbClcbiAgICBsaS5hcHBlbmRDaGlsZChkaXYpXG4gICAgcmV0dXJuIGxpXG4gIH1cblxuICBjb25zdCBjcmVhdGVOZXdNb2R1bGVJbnB1dEZvcm0gPSAodXBkYXRlT0w6IEZ1bmN0aW9uLCBpOiBhbnkpID0+IHtcbiAgICBjb25zdCBmb3JtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImZvcm1cIilcblxuICAgIGNvbnN0IG5ld01vZHVsZUlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpXG4gICAgbmV3TW9kdWxlSW5wdXQudHlwZSA9IFwidGV4dFwiXG4gICAgbmV3TW9kdWxlSW5wdXQucGxhY2Vob2xkZXIgPSBpKFwicGxheV9zaWRlYmFyX3BsdWdpbnNfb3B0aW9uc19tb2R1bGVzX3BsYWNlaG9sZGVyXCIpXG4gICAgbmV3TW9kdWxlSW5wdXQuc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbGxlZGJ5XCIsIFwiY3VzdG9tLW1vZHVsZXMtaGVhZGVyXCIpXG4gICAgZm9ybS5hcHBlbmRDaGlsZChuZXdNb2R1bGVJbnB1dClcblxuICAgIGZvcm0ub25zdWJtaXQgPSBlID0+IHtcbiAgICAgIGNvbnN0IGRzID0gdXRpbHMuY3JlYXRlRGVzaWduU3lzdGVtKGZvcm0pXG4gICAgICBkcy5kZWNsYXJlUmVzdGFydFJlcXVpcmVkKGkpXG5cbiAgICAgIGFkZEN1c3RvbVBsdWdpbihuZXdNb2R1bGVJbnB1dC52YWx1ZSlcbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcbiAgICAgIHVwZGF0ZU9MKClcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuICAgIHJldHVybiBmb3JtXG4gIH1cblxuICByZXR1cm4gcGx1Z2luXG59XG4iXX0=