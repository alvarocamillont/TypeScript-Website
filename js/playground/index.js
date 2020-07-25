define(["require", "exports", "./createElements", "./sidebar/runtime", "./exporter", "./createUI", "./getExample", "./monaco/ExampleHighlight", "./createConfigDropdown", "./sidebar/plugins", "./pluginUtils", "./sidebar/settings"], function (require, exports, createElements_1, runtime_1, exporter_1, createUI_1, getExample_1, ExampleHighlight_1, createConfigDropdown_1, plugins_1, pluginUtils_1, settings_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.setupPlayground = void 0;
    exports.setupPlayground = (sandbox, monaco, config, i, react) => {
        const playgroundParent = sandbox.getDomNode().parentElement.parentElement.parentElement;
        const dragBar = createElements_1.createDragBar();
        playgroundParent.appendChild(dragBar);
        const sidebar = createElements_1.createSidebar();
        playgroundParent.appendChild(sidebar);
        const tabBar = createElements_1.createTabBar();
        sidebar.appendChild(tabBar);
        const container = createElements_1.createPluginContainer();
        sidebar.appendChild(container);
        const plugins = [];
        const tabs = [];
        // Let's things like the workbench hook into tab changes
        let didUpdateTab;
        const registerPlugin = (plugin) => {
            plugins.push(plugin);
            const tab = createElements_1.createTabForPlugin(plugin);
            tabs.push(tab);
            const tabClicked = e => {
                const previousPlugin = getCurrentPlugin();
                let newTab = e.target;
                // It could be a notification you clicked on
                if (newTab.tagName === "DIV")
                    newTab = newTab.parentElement;
                const newPlugin = plugins.find(p => `playground-plugin-tab-${p.id}` == newTab.id);
                createElements_1.activatePlugin(newPlugin, previousPlugin, sandbox, tabBar, container);
                didUpdateTab && didUpdateTab(newPlugin, previousPlugin);
            };
            tabBar.appendChild(tab);
            tab.onclick = tabClicked;
        };
        const setDidUpdateTab = (func) => {
            didUpdateTab = func;
        };
        const getCurrentPlugin = () => {
            const selectedTab = tabs.find(t => t.classList.contains("active"));
            return plugins[tabs.indexOf(selectedTab)];
        };
        const defaultPlugins = config.plugins || settings_1.getPlaygroundPlugins();
        const utils = pluginUtils_1.createUtils(sandbox, react);
        const initialPlugins = defaultPlugins.map(f => f(i, utils));
        initialPlugins.forEach(p => registerPlugin(p));
        // Choose which should be selected
        const priorityPlugin = plugins.find(plugin => plugin.shouldBeSelected && plugin.shouldBeSelected());
        const selectedPlugin = priorityPlugin || plugins[0];
        const selectedTab = tabs[plugins.indexOf(selectedPlugin)];
        selectedTab.onclick({ target: selectedTab });
        let debouncingTimer = false;
        sandbox.editor.onDidChangeModelContent(_event => {
            const plugin = getCurrentPlugin();
            if (plugin.modelChanged)
                plugin.modelChanged(sandbox, sandbox.getModel(), container);
            // This needs to be last in the function
            if (debouncingTimer)
                return;
            debouncingTimer = true;
            setTimeout(() => {
                debouncingTimer = false;
                playgroundDebouncedMainFunction();
                // Only call the plugin function once every 0.3s
                if (plugin.modelChangedDebounce && plugin.id === getCurrentPlugin().id) {
                    plugin.modelChangedDebounce(sandbox, sandbox.getModel(), container);
                }
            }, 300);
        });
        // Sets the URL and storage of the sandbox string
        const playgroundDebouncedMainFunction = () => {
            const alwaysUpdateURL = !localStorage.getItem("disable-save-on-type");
            if (alwaysUpdateURL) {
                const newURL = sandbox.createURLQueryWithCompilerOptions(sandbox);
                window.history.replaceState({}, "", newURL);
            }
            localStorage.setItem("sandbox-history", sandbox.getText());
        };
        // When any compiler flags are changed, trigger a potential change to the URL
        sandbox.setDidUpdateCompilerSettings(() => {
            playgroundDebouncedMainFunction();
            // @ts-ignore
            window.appInsights.trackEvent({ name: "Compiler Settings changed" });
            const model = sandbox.editor.getModel();
            const plugin = getCurrentPlugin();
            if (model && plugin.modelChanged)
                plugin.modelChanged(sandbox, model, container);
            if (model && plugin.modelChangedDebounce)
                plugin.modelChangedDebounce(sandbox, model, container);
        });
        // Setup working with the existing UI, once it's loaded
        // Versions of TypeScript
        // Set up the label for the dropdown
        const versionButton = document.querySelectorAll("#versions > a").item(0);
        versionButton.innerHTML = "v" + sandbox.ts.version + " <span class='caret'/>";
        versionButton.setAttribute("aria-label", `Select version of TypeScript, currently ${sandbox.ts.version}`);
        // Add the versions to the dropdown
        const versionsMenu = document.querySelectorAll("#versions > ul").item(0);
        // Enable all submenus
        document.querySelectorAll("nav ul li").forEach(e => e.classList.add("active"));
        const notWorkingInPlayground = ["3.1.6", "3.0.1", "2.8.1", "2.7.2", "2.4.1"];
        const allVersions = [
            "4.0.0-beta",
            ...sandbox.supportedVersions.filter(f => !notWorkingInPlayground.includes(f)),
            "Nightly",
        ];
        allVersions.forEach((v) => {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.textContent = v;
            a.href = "#";
            if (v === "Nightly") {
                li.classList.add("nightly");
            }
            if (v.toLowerCase().includes("beta")) {
                li.classList.add("beta");
            }
            li.onclick = () => {
                const currentURL = sandbox.createURLQueryWithCompilerOptions(sandbox);
                const params = new URLSearchParams(currentURL.split("#")[0]);
                const version = v === "Nightly" ? "next" : v;
                params.set("ts", version);
                const hash = document.location.hash.length ? document.location.hash : "";
                const newURL = `${document.location.protocol}//${document.location.host}${document.location.pathname}?${params}${hash}`;
                // @ts-ignore - it is allowed
                document.location = newURL;
            };
            li.appendChild(a);
            versionsMenu.appendChild(li);
        });
        // Support dropdowns
        document.querySelectorAll(".navbar-sub li.dropdown > a").forEach(link => {
            const a = link;
            a.onclick = _e => {
                if (a.parentElement.classList.contains("open")) {
                    document.querySelectorAll(".navbar-sub li.open").forEach(i => i.classList.remove("open"));
                    a.setAttribute("aria-expanded", "false");
                }
                else {
                    document.querySelectorAll(".navbar-sub li.open").forEach(i => i.classList.remove("open"));
                    a.parentElement.classList.toggle("open");
                    a.setAttribute("aria-expanded", "true");
                    const exampleContainer = a.closest("li").getElementsByTagName("ul").item(0);
                    const firstLabel = exampleContainer.querySelector("label");
                    if (firstLabel)
                        firstLabel.focus();
                    // Set exact height and widths for the popovers for the main playground navigation
                    const isPlaygroundSubmenu = !!a.closest("nav");
                    if (isPlaygroundSubmenu) {
                        const playgroundContainer = document.getElementById("playground-container");
                        exampleContainer.style.height = `calc(${playgroundContainer.getBoundingClientRect().height + 26}px - 4rem)`;
                        const sideBarWidth = document.querySelector(".playground-sidebar").offsetWidth;
                        exampleContainer.style.width = `calc(100% - ${sideBarWidth}px - 71px)`;
                        // All this is to make sure that tabbing stays inside the dropdown for tsconfig/examples
                        const buttons = exampleContainer.querySelectorAll("input");
                        const lastButton = buttons.item(buttons.length - 1);
                        if (lastButton) {
                            redirectTabPressTo(lastButton, exampleContainer, ".examples-close");
                        }
                        else {
                            const sections = document.querySelectorAll("ul.examples-dropdown .section-content");
                            sections.forEach(s => {
                                const buttons = s.querySelectorAll("a.example-link");
                                const lastButton = buttons.item(buttons.length - 1);
                                if (lastButton) {
                                    redirectTabPressTo(lastButton, exampleContainer, ".examples-close");
                                }
                            });
                        }
                    }
                }
            };
        });
        // Handle escape closing dropdowns etc
        document.onkeydown = function (evt) {
            evt = evt || window.event;
            var isEscape = false;
            if ("key" in evt) {
                isEscape = evt.key === "Escape" || evt.key === "Esc";
            }
            else {
                // @ts-ignore - this used to be the case
                isEscape = evt.keyCode === 27;
            }
            if (isEscape) {
                document.querySelectorAll(".navbar-sub li.open").forEach(i => i.classList.remove("open"));
                document.querySelectorAll(".navbar-sub li").forEach(i => i.setAttribute("aria-expanded", "false"));
            }
        };
        // Set up some key commands
        sandbox.editor.addAction({
            id: "copy-clipboard",
            label: "Save to clipboard",
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S],
            contextMenuGroupId: "run",
            contextMenuOrder: 1.5,
            run: function (ed) {
                window.navigator.clipboard.writeText(location.href.toString()).then(() => ui.flashInfo(i("play_export_clipboard")), (e) => alert(e));
            },
        });
        sandbox.editor.addAction({
            id: "run-js",
            label: "Run the evaluated JavaScript for your TypeScript file",
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
            contextMenuGroupId: "run",
            contextMenuOrder: 1.5,
            run: function (ed) {
                const runButton = document.getElementById("run-button");
                runButton && runButton.onclick && runButton.onclick({});
            },
        });
        const runButton = document.getElementById("run-button");
        if (runButton) {
            runButton.onclick = () => {
                const run = sandbox.getRunnableJS();
                const runPlugin = plugins.find(p => p.id === "logs");
                createElements_1.activatePlugin(runPlugin, getCurrentPlugin(), sandbox, tabBar, container);
                runtime_1.runWithCustomLogs(run, i);
                const isJS = sandbox.config.useJavaScript;
                ui.flashInfo(i(isJS ? "play_run_js" : "play_run_ts"));
            };
        }
        // Handle the close buttons on the examples
        document.querySelectorAll("button.examples-close").forEach(b => {
            const button = b;
            button.onclick = (e) => {
                const button = e.target;
                const navLI = button.closest("li");
                navLI === null || navLI === void 0 ? void 0 : navLI.classList.remove("open");
            };
        });
        createElements_1.setupSidebarToggle();
        if (document.getElementById("config-container")) {
            createConfigDropdown_1.createConfigDropdown(sandbox, monaco);
            createConfigDropdown_1.updateConfigDropdownForCompilerOptions(sandbox, monaco);
        }
        if (document.getElementById("playground-settings")) {
            const settingsToggle = document.getElementById("playground-settings");
            settingsToggle.onclick = () => {
                const open = settingsToggle.parentElement.classList.contains("open");
                const sidebarTabs = document.querySelector(".playground-plugin-tabview");
                const sidebarContent = document.querySelector(".playground-plugin-container");
                let settingsContent = document.querySelector(".playground-settings-container");
                if (!settingsContent) {
                    settingsContent = document.createElement("div");
                    settingsContent.className = "playground-settings-container playground-plugin-container";
                    const settings = settings_1.settingsPlugin(i, utils);
                    settings.didMount && settings.didMount(sandbox, settingsContent);
                    document.querySelector(".playground-sidebar").appendChild(settingsContent);
                    // When the last tab item is hit, go back to the settings button
                    const labels = document.querySelectorAll(".playground-sidebar input");
                    const lastLabel = labels.item(labels.length - 1);
                    if (lastLabel) {
                        redirectTabPressTo(lastLabel, undefined, "#playground-settings");
                    }
                }
                if (open) {
                    sidebarTabs.style.display = "flex";
                    sidebarContent.style.display = "block";
                    settingsContent.style.display = "none";
                }
                else {
                    sidebarTabs.style.display = "none";
                    sidebarContent.style.display = "none";
                    settingsContent.style.display = "block";
                    document.querySelector(".playground-sidebar label").focus();
                }
                settingsToggle.parentElement.classList.toggle("open");
            };
        }
        // Support grabbing examples from the location hash
        if (location.hash.startsWith("#example")) {
            const exampleName = location.hash.replace("#example/", "").trim();
            sandbox.config.logger.log("Loading example:", exampleName);
            getExample_1.getExampleSourceCode(config.prefix, config.lang, exampleName).then(ex => {
                if (ex.example && ex.code) {
                    const { example, code } = ex;
                    // Update the localstorage showing that you've seen this page
                    if (localStorage) {
                        const seenText = localStorage.getItem("examples-seen") || "{}";
                        const seen = JSON.parse(seenText);
                        seen[example.id] = example.hash;
                        localStorage.setItem("examples-seen", JSON.stringify(seen));
                    }
                    // Set the menu to be the same section as this current example
                    // this happens behind the scene and isn't visible till you hover
                    // const sectionTitle = example.path[0]
                    // const allSectionTitles = document.getElementsByClassName('section-name')
                    // for (const title of allSectionTitles) {
                    //   if (title.textContent === sectionTitle) {
                    //     title.onclick({})
                    //   }
                    // }
                    const allLinks = document.querySelectorAll("example-link");
                    // @ts-ignore
                    for (const link of allLinks) {
                        if (link.textContent === example.title) {
                            link.classList.add("highlight");
                        }
                    }
                    document.title = "TypeScript Playground - " + example.title;
                    sandbox.setText(code);
                }
                else {
                    sandbox.setText("// There was an issue getting the example, bad URL? Check the console in the developer tools");
                }
            });
        }
        // This isn't optimal, but it's good enough without me adding support
        // for https://github.com/microsoft/monaco-editor/issues/313
        setInterval(() => {
            const markers = sandbox.monaco.editor.getModelMarkers({});
            utils.setNotifications("errors", markers.length);
        }, 500);
        // Sets up a way to click between examples
        monaco.languages.registerLinkProvider(sandbox.language, new ExampleHighlight_1.ExampleHighlighter());
        const languageSelector = document.getElementById("language-selector");
        if (languageSelector) {
            const params = new URLSearchParams(location.search);
            languageSelector.options.selectedIndex = params.get("useJavaScript") ? 1 : 0;
            languageSelector.onchange = () => {
                const useJavaScript = languageSelector.value === "JavaScript";
                const query = sandbox.createURLQueryWithCompilerOptions(sandbox, {
                    useJavaScript: useJavaScript ? true : undefined,
                });
                const fullURL = `${document.location.protocol}//${document.location.host}${document.location.pathname}${query}`;
                // @ts-ignore
                document.location = fullURL;
            };
        }
        const ui = createUI_1.createUI();
        const exporter = exporter_1.createExporter(sandbox, monaco, ui);
        const playground = {
            exporter,
            ui,
            registerPlugin,
            plugins,
            getCurrentPlugin,
            tabs,
            setDidUpdateTab,
            createUtils: pluginUtils_1.createUtils,
        };
        window.ts = sandbox.ts;
        window.sandbox = sandbox;
        window.playground = playground;
        console.log(`Using TypeScript ${window.ts.version}`);
        console.log("Available globals:");
        console.log("\twindow.ts", window.ts);
        console.log("\twindow.sandbox", window.sandbox);
        console.log("\twindow.playground", window.playground);
        console.log("\twindow.react", window.react);
        console.log("\twindow.reactDOM", window.reactDOM);
        /** A plugin */
        const activateExternalPlugin = (plugin, autoActivate) => {
            let readyPlugin;
            // Can either be a factory, or object
            if (typeof plugin === "function") {
                const utils = pluginUtils_1.createUtils(sandbox, react);
                readyPlugin = plugin(utils);
            }
            else {
                readyPlugin = plugin;
            }
            if (autoActivate) {
                console.log(readyPlugin);
            }
            playground.registerPlugin(readyPlugin);
            // Auto-select the dev plugin
            const pluginWantsFront = readyPlugin.shouldBeSelected && readyPlugin.shouldBeSelected();
            if (pluginWantsFront || autoActivate) {
                // Auto-select the dev plugin
                createElements_1.activatePlugin(readyPlugin, getCurrentPlugin(), sandbox, tabBar, container);
            }
        };
        // Dev mode plugin
        if (config.supportCustomPlugins && plugins_1.allowConnectingToLocalhost()) {
            window.exports = {};
            console.log("Connecting to dev plugin");
            try {
                // @ts-ignore
                const re = window.require;
                re(["local/index"], (devPlugin) => {
                    console.log("Set up dev plugin from localhost:5000");
                    try {
                        activateExternalPlugin(devPlugin, true);
                    }
                    catch (error) {
                        console.error(error);
                        setTimeout(() => {
                            ui.flashInfo("Error: Could not load dev plugin from localhost:5000");
                        }, 700);
                    }
                });
            }
            catch (error) {
                console.error("Problem loading up the dev plugin");
                console.error(error);
            }
        }
        const downloadPlugin = (plugin, autoEnable) => {
            try {
                // @ts-ignore
                const re = window.require;
                re([`unpkg/${plugin}@latest/dist/index`], (devPlugin) => {
                    activateExternalPlugin(devPlugin, autoEnable);
                });
            }
            catch (error) {
                console.error("Problem loading up the plugin:", plugin);
                console.error(error);
            }
        };
        if (config.supportCustomPlugins) {
            // Grab ones from localstorage
            plugins_1.activePlugins().forEach(p => downloadPlugin(p.module, false));
            // Offer to install one if 'install-plugin' is a query param
            const params = new URLSearchParams(location.search);
            const pluginToInstall = params.get("install-plugin");
            if (pluginToInstall) {
                const alreadyInstalled = plugins_1.activePlugins().find(p => p.module === pluginToInstall);
                if (!alreadyInstalled) {
                    const shouldDoIt = confirm("Would you like to install the third party plugin?\n\n" + pluginToInstall);
                    if (shouldDoIt) {
                        plugins_1.addCustomPlugin(pluginToInstall);
                        downloadPlugin(pluginToInstall, true);
                    }
                }
            }
        }
        if (location.hash.startsWith("#show-examples")) {
            setTimeout(() => {
                var _a;
                (_a = document.getElementById("examples-button")) === null || _a === void 0 ? void 0 : _a.click();
            }, 100);
        }
        if (location.hash.startsWith("#show-whatisnew")) {
            setTimeout(() => {
                var _a;
                (_a = document.getElementById("whatisnew-button")) === null || _a === void 0 ? void 0 : _a.click();
            }, 100);
        }
        return playground;
    };
    const redirectTabPressTo = (element, container, query) => {
        // element.style.backgroundColor = "red"
        element.addEventListener("keydown", e => {
            if (e.keyCode === 9) {
                const host = container || document;
                const result = host.querySelector(query);
                if (!result)
                    throw new Error(`Expected to find a result for keydown`);
                result.focus();
                console.log(result);
                e.preventDefault();
            }
        });
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wbGF5Z3JvdW5kL3NyYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0lBc0VhLFFBQUEsZUFBZSxHQUFHLENBQzdCLE9BQWdCLEVBQ2hCLE1BQWMsRUFDZCxNQUF3QixFQUN4QixDQUEwQixFQUMxQixLQUFtQixFQUNuQixFQUFFO1FBQ0YsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUMsYUFBYyxDQUFDLGFBQWMsQ0FBQyxhQUFjLENBQUE7UUFDMUYsTUFBTSxPQUFPLEdBQUcsOEJBQWEsRUFBRSxDQUFBO1FBQy9CLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUVyQyxNQUFNLE9BQU8sR0FBRyw4QkFBYSxFQUFFLENBQUE7UUFDL0IsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRXJDLE1BQU0sTUFBTSxHQUFHLDZCQUFZLEVBQUUsQ0FBQTtRQUM3QixPQUFPLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRTNCLE1BQU0sU0FBUyxHQUFHLHNDQUFxQixFQUFFLENBQUE7UUFDekMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUU5QixNQUFNLE9BQU8sR0FBRyxFQUF3QixDQUFBO1FBQ3hDLE1BQU0sSUFBSSxHQUFHLEVBQXlCLENBQUE7UUFFdEMsd0RBQXdEO1FBQ3hELElBQUksWUFBaUcsQ0FBQTtRQUVyRyxNQUFNLGNBQWMsR0FBRyxDQUFDLE1BQXdCLEVBQUUsRUFBRTtZQUNsRCxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBRXBCLE1BQU0sR0FBRyxHQUFHLG1DQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBRXRDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFFZCxNQUFNLFVBQVUsR0FBMkIs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LEdBQUcsQ0FBQyxDQUFBO1NBQ1I7UUFFRCxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLEVBQUU7WUFDL0MsVUFBVSxDQUFDLEdBQUcsRUFBRTs7Z0JBQ2QsTUFBQSxRQUFRLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLDBDQUFFLEtBQUssR0FBRTtZQUN0RCxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7U0FDUjtRQUVELE9BQU8sVUFBVSxDQUFBO0lBQ25CLENBQUMsQ0FBQTtJQUlELE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxPQUFvQixFQUFFLFNBQWtDLEVBQUUsS0FBYSxFQUFFLEVBQUU7UUFDckcsd0NBQXdDO1FBQ3hDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUU7WUFDdEMsSUFBSSxDQUFDLENBQUMsT0FBTyxLQUFLLENBQUMsRUFBRTtnQkFDbkIsTUFBTSxJQUFJLEdBQUcsU0FBUyxJQUFJLFFBQVEsQ0FBQTtnQkFDbEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQVEsQ0FBQTtnQkFDL0MsSUFBSSxDQUFDLE1BQU07b0JBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFBO2dCQUNyRSxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUE7Z0JBQ2QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDbkIsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFBO2FBQ25CO1FBQ0gsQ0FBQyxDQUFDLENBQUE7SUFDSixDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJ0eXBlIFNhbmRib3ggPSBpbXBvcnQoXCJ0eXBlc2NyaXB0LXNhbmRib3hcIikuU2FuZGJveFxudHlwZSBNb25hY28gPSB0eXBlb2YgaW1wb3J0KFwibW9uYWNvLWVkaXRvclwiKVxuXG5kZWNsYXJlIGNvbnN0IHdpbmRvdzogYW55XG5cbmltcG9ydCB7XG4gIGNyZWF0ZVNpZGViYXIsXG4gIGNyZWF0ZVRhYkZvclBsdWdpbixcbiAgY3JlYXRlVGFiQmFyLFxuICBjcmVhdGVQbHVnaW5Db250YWluZXIsXG4gIGFjdGl2YXRlUGx1Z2luLFxuICBjcmVhdGVEcmFnQmFyLFxuICBzZXR1cFNpZGViYXJUb2dnbGUsXG59IGZyb20gXCIuL2NyZWF0ZUVsZW1lbnRzXCJcbmltcG9ydCB7IHJ1bldpdGhDdXN0b21Mb2dzIH0gZnJvbSBcIi4vc2lkZWJhci9ydW50aW1lXCJcbmltcG9ydCB7IGNyZWF0ZUV4cG9ydGVyIH0gZnJvbSBcIi4vZXhwb3J0ZXJcIlxuaW1wb3J0IHsgY3JlYXRlVUkgfSBmcm9tIFwiLi9jcmVhdGVVSVwiXG5pbXBvcnQgeyBnZXRFeGFtcGxlU291cmNlQ29kZSB9IGZyb20gXCIuL2dldEV4YW1wbGVcIlxuaW1wb3J0IHsgRXhhbXBsZUhpZ2hsaWdodGVyIH0gZnJvbSBcIi4vbW9uYWNvL0V4YW1wbGVIaWdobGlnaHRcIlxuaW1wb3J0IHsgY3JlYXRlQ29uZmlnRHJvcGRvd24sIHVwZGF0ZUNvbmZpZ0Ryb3Bkb3duRm9yQ29tcGlsZXJPcHRpb25zIH0gZnJvbSBcIi4vY3JlYXRlQ29uZmlnRHJvcGRvd25cIlxuaW1wb3J0IHsgYWxsb3dDb25uZWN0aW5nVG9Mb2NhbGhvc3QsIGFjdGl2ZVBsdWdpbnMsIGFkZEN1c3RvbVBsdWdpbiB9IGZyb20gXCIuL3NpZGViYXIvcGx1Z2luc1wiXG5pbXBvcnQgeyBjcmVhdGVVdGlscywgUGx1Z2luVXRpbHMgfSBmcm9tIFwiLi9wbHVnaW5VdGlsc1wiXG5pbXBvcnQgdHlwZSBSZWFjdCBmcm9tIFwicmVhY3RcIlxuaW1wb3J0IHsgc2V0dGluZ3NQbHVnaW4sIGdldFBsYXlncm91bmRQbHVnaW5zIH0gZnJvbSBcIi4vc2lkZWJhci9zZXR0aW5nc1wiXG5cbmV4cG9ydCB7IFBsdWdpblV0aWxzIH0gZnJvbSBcIi4vcGx1Z2luVXRpbHNcIlxuXG5leHBvcnQgdHlwZSBQbHVnaW5GYWN0b3J5ID0ge1xuICAoaTogKGtleTogc3RyaW5nLCBjb21wb25lbnRzPzogYW55KSA9PiBzdHJpbmcsIHV0aWxzOiBQbHVnaW5VdGlscyk6IFBsYXlncm91bmRQbHVnaW5cbn1cblxuLyoqIFRoZSBpbnRlcmZhY2Ugb2YgYWxsIHNpZGViYXIgcGx1Z2lucyAqL1xuZXhwb3J0IGludGVyZmFjZSBQbGF5Z3JvdW5kUGx1Z2luIHtcbiAgLyoqIE5vdCBwdWJsaWMgZmFjaW5nLCBidXQgdXNlZCBieSB0aGUgcGxheWdyb3VuZCB0byB1bmlxdWVseSBpZGVudGlmeSBwbHVnaW5zICovXG4gIGlkOiBzdHJpbmdcbiAgLyoqIFRvIHNob3cgaW4gdGhlIHRhYnMgKi9cbiAgZGlzcGxheU5hbWU6IHN0cmluZ1xuICAvKiogU2hvdWxkIHRoaXMgcGx1Z2luIGJlIHNlbGVjdGVkIHdoZW4gdGhlIHBsdWdpbiBpcyBmaXJzdCBsb2FkZWQ/IExldHMgeW91IGNoZWNrIGZvciBxdWVyeSB2YXJzIGV0YyB0byBsb2FkIGEgcGFydGljdWxhciBwbHVnaW4gKi9cbiAgc2hvdWxkQmVTZWxlY3RlZD86ICgpID0+IGJvb2xlYW5cbiAgLyoqIEJlZm9yZSB3ZSBzaG93IHRoZSB0YWIsIHVzZSB0aGlzIHRvIHNldCB1cCB5b3VyIEhUTUwgLSBpdCB3aWxsIGFsbCBiZSByZW1vdmVkIGJ5IHRoZSBwbGF5Z3JvdW5kIHdoZW4gc29tZW9uZSBuYXZpZ2F0ZXMgb2ZmIHRoZSB0YWIgKi9cbiAgd2lsbE1vdW50PzogKHNhbmRib3g6IFNhbmRib3gsIGNvbnRhaW5lcjogSFRNTERpdkVsZW1lbnQpID0+IHZvaWRcbiAgLyoqIEFmdGVyIHdlIHNob3cgdGhlIHRhYiAqL1xuICBkaWRNb3VudD86IChzYW5kYm94OiBTYW5kYm94LCBjb250YWluZXI6IEhUTUxEaXZFbGVtZW50KSA9PiB2b2lkXG4gIC8qKiBNb2RlbCBjaGFuZ2VzIHdoaWxlIHRoaXMgcGx1Z2luIGlzIGFjdGl2ZWx5IHNlbGVjdGVkICAqL1xuICBtb2RlbENoYW5nZWQ/OiAoc2FuZGJveDogU2FuZGJveCwgbW9kZWw6IGltcG9ydChcIm1vbmFjby1lZGl0b3JcIikuZWRpdG9yLklUZXh0TW9kZWwsIGNvbnRhaW5lcjogSFRNTERpdkVsZW1lbnQpID0+IHZvaWRcbiAgLyoqIERlbGF5ZWQgbW9kZWwgY2hhbmdlcyB3aGlsZSB0aGlzIHBsdWdpbiBpcyBhY3RpdmVseSBzZWxlY3RlZCwgdXNlZnVsIHdoZW4geW91IGFyZSB3b3JraW5nIHdpdGggdGhlIFRTIEFQSSBiZWNhdXNlIGl0IHdvbid0IHJ1biBvbiBldmVyeSBrZXlwcmVzcyAqL1xuICBtb2RlbENoYW5nZWREZWJvdW5jZT86IChcbiAgICBzYW5kYm94OiBTYW5kYm94LFxuICAgIG1vZGVsOiBpbXBvcnQoXCJtb25hY28tZWRpdG9yXCIpLmVkaXRvci5JVGV4dE1vZGVsLFxuICAgIGNvbnRhaW5lcjogSFRNTERpdkVsZW1lbnRcbiAgKSA9PiB2b2lkXG4gIC8qKiBCZWZvcmUgd2UgcmVtb3ZlIHRoZSB0YWIgKi9cbiAgd2lsbFVubW91bnQ/OiAoc2FuZGJveDogU2FuZGJveCwgY29udGFpbmVyOiBIVE1MRGl2RWxlbWVudCkgPT4gdm9pZFxuICAvKiogQWZ0ZXIgd2UgcmVtb3ZlIHRoZSB0YWIgKi9cbiAgZGlkVW5tb3VudD86IChzYW5kYm94OiBTYW5kYm94LCBjb250YWluZXI6IEhUTUxEaXZFbGVtZW50KSA9PiB2b2lkXG4gIC8qKiBBbiBvYmplY3QgeW91IGNhbiB1c2UgdG8ga2VlcCBkYXRhIGFyb3VuZCBpbiB0aGUgc2NvcGUgb2YgeW91ciBwbHVnaW4gb2JqZWN0ICovXG4gIGRhdGE/OiBhbnlcbn1cblxuaW50ZXJmYWNlIFBsYXlncm91bmRDb25maWcge1xuICAvKiogTGFuZ3VhZ2UgbGlrZSBcImVuXCIgLyBcImphXCIgZXRjICovXG4gIGxhbmc6IHN0cmluZ1xuICAvKiogU2l0ZSBwcmVmaXgsIGxpa2UgXCJ2MlwiIGR1cmluZyB0aGUgcHJlLXJlbGVhc2UgKi9cbiAgcHJlZml4OiBzdHJpbmdcbiAgLyoqIE9wdGlvbmFsIHBsdWdpbnMgc28gdGhhdCB3ZSBjYW4gcmUtdXNlIHRoZSBwbGF5Z3JvdW5kIHdpdGggZGlmZmVyZW50IHNpZGViYXJzICovXG4gIHBsdWdpbnM/OiBQbHVnaW5GYWN0b3J5W11cbiAgLyoqIFNob3VsZCB0aGlzIHBsYXlncm91bmQgbG9hZCB1cCBjdXN0b20gcGx1Z2lucyBmcm9tIGxvY2FsU3RvcmFnZT8gKi9cbiAgc3VwcG9ydEN1c3RvbVBsdWdpbnM6IGJvb2xlYW5cbn1cblxuZXhwb3J0IGNvbnN0IHNldHVwUGxheWdyb3VuZCA9IChcbiAgc2FuZGJveDogU2FuZGJveCxcbiAgbW9uYWNvOiBNb25hY28sXG4gIGNvbmZpZzogUGxheWdyb3VuZENvbmZpZyxcbiAgaTogKGtleTogc3RyaW5nKSA9PiBzdHJpbmcsXG4gIHJlYWN0OiB0eXBlb2YgUmVhY3RcbikgPT4ge1xuICBjb25zdCBwbGF5Z3JvdW5kUGFyZW50ID0gc2FuZGJveC5nZXREb21Ob2RlKCkucGFyZW50RWxlbWVudCEucGFyZW50RWxlbWVudCEucGFyZW50RWxlbWVudCFcbiAgY29uc3QgZHJhZ0JhciA9IGNyZWF0ZURyYWdCYXIoKVxuICBwbGF5Z3JvdW5kUGFyZW50LmFwcGVuZENoaWxkKGRyYWdCYXIpXG5cbiAgY29uc3Qgc2lkZWJhciA9IGNyZWF0ZVNpZGViYXIoKVxuICBwbGF5Z3JvdW5kUGFyZW50LmFwcGVuZENoaWxkKHNpZGViYXIpXG5cbiAgY29uc3QgdGFiQmFyID0gY3JlYXRlVGFiQmFyKClcbiAgc2lkZWJhci5hcHBlbmRDaGlsZCh0YWJCYXIpXG5cbiAgY29uc3QgY29udGFpbmVyID0gY3JlYXRlUGx1Z2luQ29udGFpbmVyKClcbiAgc2lkZWJhci5hcHBlbmRDaGlsZChjb250YWluZXIpXG5cbiAgY29uc3QgcGx1Z2lucyA9IFtdIGFzIFBsYXlncm91bmRQbHVnaW5bXVxuICBjb25zdCB0YWJzID0gW10gYXMgSFRNTEJ1dHRvbkVsZW1lbnRbXVxuXG4gIC8vIExldCdzIHRoaW5ncyBsaWtlIHRoZSB3b3JrYmVuY2ggaG9vayBpbnRvIHRhYiBjaGFuZ2VzXG4gIGxldCBkaWRVcGRhdGVUYWI6IChuZXdQbHVnaW46IFBsYXlncm91bmRQbHVnaW4sIHByZXZpb3VzUGx1Z2luOiBQbGF5Z3JvdW5kUGx1Z2luKSA9PiB2b2lkIHwgdW5kZWZpbmVkXG5cbiAgY29uc3QgcmVnaXN0ZXJQbHVnaW4gPSAocGx1Z2luOiBQbGF5Z3JvdW5kUGx1Z2luKSA9PiB7XG4gICAgcGx1Z2lucy5wdXNoKHBsdWdpbilcblxuICAgIGNvbnN0IHRhYiA9IGNyZWF0ZVRhYkZvclBsdWdpbihwbHVnaW4pXG5cbiAgICB0YWJzLnB1c2godGFiKVxuXG4gICAgY29uc3QgdGFiQ2xpY2tlZDogSFRNTEVsZW1lbnRbXCJvbmNsaWNrXCJdID0gZSA9PiB7XG4gICAgICBjb25zdCBwcmV2aW91c1BsdWdpbiA9IGdldEN1cnJlbnRQbHVnaW4oKVxuICAgICAgbGV0IG5ld1RhYiA9IGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50XG4gICAgICAvLyBJdCBjb3VsZCBiZSBhIG5vdGlmaWNhdGlvbiB5b3UgY2xpY2tlZCBvblxuICAgICAgaWYgKG5ld1RhYi50YWdOYW1lID09PSBcIkRJVlwiKSBuZXdUYWIgPSBuZXdUYWIucGFyZW50RWxlbWVudCFcbiAgICAgIGNvbnN0IG5ld1BsdWdpbiA9IHBsdWdpbnMuZmluZChwID0+IGBwbGF5Z3JvdW5kLXBsdWdpbi10YWItJHtwLmlkfWAgPT0gbmV3VGFiLmlkKSFcbiAgICAgIGFjdGl2YXRlUGx1Z2luKG5ld1BsdWdpbiwgcHJldmlvdXNQbHVnaW4sIHNhbmRib3gsIHRhYkJhciwgY29udGFpbmVyKVxuICAgICAgZGlkVXBkYXRlVGFiICYmIGRpZFVwZGF0ZVRhYihuZXdQbHVnaW4sIHByZXZpb3VzUGx1Z2luKVxuICAgIH1cblxuICAgIHRhYkJhci5hcHBlbmRDaGlsZCh0YWIpXG4gICAgdGFiLm9uY2xpY2sgPSB0YWJDbGlja2VkXG4gIH1cblxuICBjb25zdCBzZXREaWRVcGRhdGVUYWIgPSAoZnVuYzogKG5ld1BsdWdpbjogUGxheWdyb3VuZFBsdWdpbiwgcHJldmlvdXNQbHVnaW46IFBsYXlncm91bmRQbHVnaW4pID0+IHZvaWQpID0+IHtcbiAgICBkaWRVcGRhdGVUYWIgPSBmdW5jXG4gIH1cblxuICBjb25zdCBnZXRDdXJyZW50UGx1Z2luID0gKCkgPT4ge1xuICAgIGNvbnN0IHNlbGVjdGVkVGFiID0gdGFicy5maW5kKHQgPT4gdC5jbGFzc0xpc3QuY29udGFpbnMoXCJhY3RpdmVcIikpIVxuICAgIHJldHVybiBwbHVnaW5zW3RhYnMuaW5kZXhPZihzZWxlY3RlZFRhYildXG4gIH1cblxuICBjb25zdCBkZWZhdWx0UGx1Z2lucyA9IGNvbmZpZy5wbHVnaW5zIHx8IGdldFBsYXlncm91bmRQbHVnaW5zKClcbiAgY29uc3QgdXRpbHMgPSBjcmVhdGVVdGlscyhzYW5kYm94LCByZWFjdClcbiAgY29uc3QgaW5pdGlhbFBsdWdpbnMgPSBkZWZhdWx0UGx1Z2lucy5tYXAoZiA9PiBmKGksIHV0aWxzKSlcbiAgaW5pdGlhbFBsdWdpbnMuZm9yRWFjaChwID0+IHJlZ2lzdGVyUGx1Z2luKHApKVxuXG4gIC8vIENob29zZSB3aGljaCBzaG91bGQgYmUgc2VsZWN0ZWRcbiAgY29uc3QgcHJpb3JpdHlQbHVnaW4gPSBwbHVnaW5zLmZpbmQocGx1Z2luID0+IHBsdWdpbi5zaG91bGRCZVNlbGVjdGVkICYmIHBsdWdpbi5zaG91bGRCZVNlbGVjdGVkKCkpXG4gIGNvbnN0IHNlbGVjdGVkUGx1Z2luID0gcHJpb3JpdHlQbHVnaW4gfHwgcGx1Z2luc1swXVxuICBjb25zdCBzZWxlY3RlZFRhYiA9IHRhYnNbcGx1Z2lucy5pbmRleE9mKHNlbGVjdGVkUGx1Z2luKV0hXG4gIHNlbGVjdGVkVGFiLm9uY2xpY2shKHsgdGFyZ2V0OiBzZWxlY3RlZFRhYiB9IGFzIGFueSlcblxuICBsZXQgZGVib3VuY2luZ1RpbWVyID0gZmFsc2VcbiAgc2FuZGJveC5lZGl0b3Iub25EaWRDaGFuZ2VNb2RlbENvbnRlbnQoX2V2ZW50ID0+IHtcbiAgICBjb25zdCBwbHVnaW4gPSBnZXRDdXJyZW50UGx1Z2luKClcbiAgICBpZiAocGx1Z2luLm1vZGVsQ2hhbmdlZCkgcGx1Z2luLm1vZGVsQ2hhbmdlZChzYW5kYm94LCBzYW5kYm94LmdldE1vZGVsKCksIGNvbnRhaW5lcilcblxuICAgIC8vIFRoaXMgbmVlZHMgdG8gYmUgbGFzdCBpbiB0aGUgZnVuY3Rpb25cbiAgICBpZiAoZGVib3VuY2luZ1RpbWVyKSByZXR1cm5cbiAgICBkZWJvdW5jaW5nVGltZXIgPSB0cnVlXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBkZWJvdW5jaW5nVGltZXIgPSBmYWxzZVxuICAgICAgcGxheWdyb3VuZERlYm91bmNlZE1haW5GdW5jdGlvbigpXG5cbiAgICAgIC8vIE9ubHkgY2FsbCB0aGUgcGx1Z2luIGZ1bmN0aW9uIG9uY2UgZXZlcnkgMC4zc1xuICAgICAgaWYgKHBsdWdpbi5tb2RlbENoYW5nZWREZWJvdW5jZSAmJiBwbHVnaW4uaWQgPT09IGdldEN1cnJlbnRQbHVnaW4oKS5pZCkge1xuICAgICAgICBwbHVnaW4ubW9kZWxDaGFuZ2VkRGVib3VuY2Uoc2FuZGJveCwgc2FuZGJveC5nZXRNb2RlbCgpLCBjb250YWluZXIpXG4gICAgICB9XG4gICAgfSwgMzAwKVxuICB9KVxuXG4gIC8vIFNldHMgdGhlIFVSTCBhbmQgc3RvcmFnZSBvZiB0aGUgc2FuZGJveCBzdHJpbmdcbiAgY29uc3QgcGxheWdyb3VuZERlYm91bmNlZE1haW5GdW5jdGlvbiA9ICgpID0+IHtcbiAgICBjb25zdCBhbHdheXNVcGRhdGVVUkwgPSAhbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJkaXNhYmxlLXNhdmUtb24tdHlwZVwiKVxuICAgIGlmIChhbHdheXNVcGRhdGVVUkwpIHtcbiAgICAgIGNvbnN0IG5ld1VSTCA9IHNhbmRib3guY3JlYXRlVVJMUXVlcnlXaXRoQ29tcGlsZXJPcHRpb25zKHNhbmRib3gpXG4gICAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUoe30sIFwiXCIsIG5ld1VSTClcbiAgICB9XG5cbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInNhbmRib3gtaGlzdG9yeVwiLCBzYW5kYm94LmdldFRleHQoKSlcbiAgfVxuXG4gIC8vIFdoZW4gYW55IGNvbXBpbGVyIGZsYWdzIGFyZSBjaGFuZ2VkLCB0cmlnZ2VyIGEgcG90ZW50aWFsIGNoYW5nZSB0byB0aGUgVVJMXG4gIHNhbmRib3guc2V0RGlkVXBkYXRlQ29tcGlsZXJTZXR0aW5ncygoKSA9PiB7XG4gICAgcGxheWdyb3VuZERlYm91bmNlZE1haW5GdW5jdGlvbigpXG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHdpbmRvdy5hcHBJbnNpZ2h0cy50cmFja0V2ZW50KHsgbmFtZTogXCJDb21waWxlciBTZXR0aW5ncyBjaGFuZ2VkXCIgfSlcblxuICAgIGNvbnN0IG1vZGVsID0gc2FuZGJveC5lZGl0b3IuZ2V0TW9kZWwoKVxuICAgIGNvbnN0IHBsdWdpbiA9IGdldEN1cnJlbnRQbHVnaW4oKVxuICAgIGlmIChtb2RlbCAmJiBwbHVnaW4ubW9kZWxDaGFuZ2VkKSBwbHVnaW4ubW9kZWxDaGFuZ2VkKHNhbmRib3gsIG1vZGVsLCBjb250YWluZXIpXG4gICAgaWYgKG1vZGVsICYmIHBsdWdpbi5tb2RlbENoYW5nZWREZWJvdW5jZSkgcGx1Z2luLm1vZGVsQ2hhbmdlZERlYm91bmNlKHNhbmRib3gsIG1vZGVsLCBjb250YWluZXIpXG4gIH0pXG5cbiAgLy8gU2V0dXAgd29ya2luZyB3aXRoIHRoZSBleGlzdGluZyBVSSwgb25jZSBpdCdzIGxvYWRlZFxuXG4gIC8vIFZlcnNpb25zIG9mIFR5cGVTY3JpcHRcblxuICAvLyBTZXQgdXAgdGhlIGxhYmVsIGZvciB0aGUgZHJvcGRvd25cbiAgY29uc3QgdmVyc2lvbkJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIjdmVyc2lvbnMgPiBhXCIpLml0ZW0oMClcbiAgdmVyc2lvbkJ1dHRvbi5pbm5lckhUTUwgPSBcInZcIiArIHNhbmRib3gudHMudmVyc2lvbiArIFwiIDxzcGFuIGNsYXNzPSdjYXJldCcvPlwiXG4gIHZlcnNpb25CdXR0b24uc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiLCBgU2VsZWN0IHZlcnNpb24gb2YgVHlwZVNjcmlwdCwgY3VycmVudGx5ICR7c2FuZGJveC50cy52ZXJzaW9ufWApXG5cbiAgLy8gQWRkIHRoZSB2ZXJzaW9ucyB0byB0aGUgZHJvcGRvd25cbiAgY29uc3QgdmVyc2lvbnNNZW51ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIiN2ZXJzaW9ucyA+IHVsXCIpLml0ZW0oMClcblxuICAvLyBFbmFibGUgYWxsIHN1Ym1lbnVzXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCJuYXYgdWwgbGlcIikuZm9yRWFjaChlID0+IGUuY2xhc3NMaXN0LmFkZChcImFjdGl2ZVwiKSlcblxuICBjb25zdCBub3RXb3JraW5nSW5QbGF5Z3JvdW5kID0gW1wiMy4xLjZcIiwgXCIzLjAuMVwiLCBcIjIuOC4xXCIsIFwiMi43LjJcIiwgXCIyLjQuMVwiXVxuXG4gIGNvbnN0IGFsbFZlcnNpb25zID0gW1xuICAgIFwiNC4wLjAtYmV0YVwiLFxuICAgIC4uLnNhbmRib3guc3VwcG9ydGVkVmVyc2lvbnMuZmlsdGVyKGYgPT4gIW5vdFdvcmtpbmdJblBsYXlncm91bmQuaW5jbHVkZXMoZikpLFxuICAgIFwiTmlnaHRseVwiLFxuICBdXG5cbiAgYWxsVmVyc2lvbnMuZm9yRWFjaCgodjogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlcIilcbiAgICBjb25zdCBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIilcbiAgICBhLnRleHRDb250ZW50ID0gdlxuICAgIGEuaHJlZiA9IFwiI1wiXG5cbiAgICBpZiAodiA9PT0gXCJOaWdodGx5XCIpIHtcbiAgICAgIGxpLmNsYXNzTGlzdC5hZGQoXCJuaWdodGx5XCIpXG4gICAgfVxuXG4gICAgaWYgKHYudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhcImJldGFcIikpIHtcbiAgICAgIGxpLmNsYXNzTGlzdC5hZGQoXCJiZXRhXCIpXG4gICAgfVxuXG4gICAgbGkub25jbGljayA9ICgpID0+IHtcbiAgICAgIGNvbnN0IGN1cnJlbnRVUkwgPSBzYW5kYm94LmNyZWF0ZVVSTFF1ZXJ5V2l0aENvbXBpbGVyT3B0aW9ucyhzYW5kYm94KVxuICAgICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhjdXJyZW50VVJMLnNwbGl0KFwiI1wiKVswXSlcbiAgICAgIGNvbnN0IHZlcnNpb24gPSB2ID09PSBcIk5pZ2h0bHlcIiA/IFwibmV4dFwiIDogdlxuICAgICAgcGFyYW1zLnNldChcInRzXCIsIHZlcnNpb24pXG5cbiAgICAgIGNvbnN0IGhhc2ggPSBkb2N1bWVudC5sb2NhdGlvbi5oYXNoLmxlbmd0aCA/IGRvY3VtZW50LmxvY2F0aW9uLmhhc2ggOiBcIlwiXG4gICAgICBjb25zdCBuZXdVUkwgPSBgJHtkb2N1bWVudC5sb2NhdGlvbi5wcm90b2NvbH0vLyR7ZG9jdW1lbnQubG9jYXRpb24uaG9zdH0ke2RvY3VtZW50LmxvY2F0aW9uLnBhdGhuYW1lfT8ke3BhcmFtc30ke2hhc2h9YFxuXG4gICAgICAvLyBAdHMtaWdub3JlIC0gaXQgaXMgYWxsb3dlZFxuICAgICAgZG9jdW1lbnQubG9jYXRpb24gPSBuZXdVUkxcbiAgICB9XG5cbiAgICBsaS5hcHBlbmRDaGlsZChhKVxuICAgIHZlcnNpb25zTWVudS5hcHBlbmRDaGlsZChsaSlcbiAgfSlcblxuICAvLyBTdXBwb3J0IGRyb3Bkb3duc1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLm5hdmJhci1zdWIgbGkuZHJvcGRvd24gPiBhXCIpLmZvckVhY2gobGluayA9PiB7XG4gICAgY29uc3QgYSA9IGxpbmsgYXMgSFRNTEFuY2hvckVsZW1lbnRcbiAgICBhLm9uY2xpY2sgPSBfZSA9PiB7XG4gICAgICBpZiAoYS5wYXJlbnRFbGVtZW50IS5jbGFzc0xpc3QuY29udGFpbnMoXCJvcGVuXCIpKSB7XG4gICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIubmF2YmFyLXN1YiBsaS5vcGVuXCIpLmZvckVhY2goaSA9PiBpLmNsYXNzTGlzdC5yZW1vdmUoXCJvcGVuXCIpKVxuICAgICAgICBhLnNldEF0dHJpYnV0ZShcImFyaWEtZXhwYW5kZWRcIiwgXCJmYWxzZVwiKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5uYXZiYXItc3ViIGxpLm9wZW5cIikuZm9yRWFjaChpID0+IGkuY2xhc3NMaXN0LnJlbW92ZShcIm9wZW5cIikpXG4gICAgICAgIGEucGFyZW50RWxlbWVudCEuY2xhc3NMaXN0LnRvZ2dsZShcIm9wZW5cIilcbiAgICAgICAgYS5zZXRBdHRyaWJ1dGUoXCJhcmlhLWV4cGFuZGVkXCIsIFwidHJ1ZVwiKVxuXG4gICAgICAgIGNvbnN0IGV4YW1wbGVDb250YWluZXIgPSBhLmNsb3Nlc3QoXCJsaVwiKSEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJ1bFwiKS5pdGVtKDApIVxuXG4gICAgICAgIGNvbnN0IGZpcnN0TGFiZWwgPSBleGFtcGxlQ29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoXCJsYWJlbFwiKSBhcyBIVE1MRWxlbWVudFxuICAgICAgICBpZiAoZmlyc3RMYWJlbCkgZmlyc3RMYWJlbC5mb2N1cygpXG5cbiAgICAgICAgLy8gU2V0IGV4YWN0IGhlaWdodCBhbmQgd2lkdGhzIGZvciB0aGUgcG9wb3ZlcnMgZm9yIHRoZSBtYWluIHBsYXlncm91bmQgbmF2aWdhdGlvblxuICAgICAgICBjb25zdCBpc1BsYXlncm91bmRTdWJtZW51ID0gISFhLmNsb3Nlc3QoXCJuYXZcIilcbiAgICAgICAgaWYgKGlzUGxheWdyb3VuZFN1Ym1lbnUpIHtcbiAgICAgICAgICBjb25zdCBwbGF5Z3JvdW5kQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbGF5Z3JvdW5kLWNvbnRhaW5lclwiKSFcbiAgICAgICAgICBleGFtcGxlQ29udGFpbmVyLnN0eWxlLmhlaWdodCA9IGBjYWxjKCR7cGxheWdyb3VuZENvbnRhaW5lci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQgKyAyNn1weCAtIDRyZW0pYFxuXG4gICAgICAgICAgY29uc3Qgc2lkZUJhcldpZHRoID0gKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIucGxheWdyb3VuZC1zaWRlYmFyXCIpIGFzIGFueSkub2Zmc2V0V2lkdGhcbiAgICAgICAgICBleGFtcGxlQ29udGFpbmVyLnN0eWxlLndpZHRoID0gYGNhbGMoMTAwJSAtICR7c2lkZUJhcldpZHRofXB4IC0gNzFweClgXG5cbiAgICAgICAgICAvLyBBbGwgdGhpcyBpcyB0byBtYWtlIHN1cmUgdGhhdCB0YWJiaW5nIHN0YXlzIGluc2lkZSB0aGUgZHJvcGRvd24gZm9yIHRzY29uZmlnL2V4YW1wbGVzXG4gICAgICAgICAgY29uc3QgYnV0dG9ucyA9IGV4YW1wbGVDb250YWluZXIucXVlcnlTZWxlY3RvckFsbChcImlucHV0XCIpXG4gICAgICAgICAgY29uc3QgbGFzdEJ1dHRvbiA9IGJ1dHRvbnMuaXRlbShidXR0b25zLmxlbmd0aCAtIDEpIGFzIEhUTUxFbGVtZW50XG4gICAgICAgICAgaWYgKGxhc3RCdXR0b24pIHtcbiAgICAgICAgICAgIHJlZGlyZWN0VGFiUHJlc3NUbyhsYXN0QnV0dG9uLCBleGFtcGxlQ29udGFpbmVyLCBcIi5leGFtcGxlcy1jbG9zZVwiKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBzZWN0aW9ucyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCJ1bC5leGFtcGxlcy1kcm9wZG93biAuc2VjdGlvbi1jb250ZW50XCIpXG4gICAgICAgICAgICBzZWN0aW9ucy5mb3JFYWNoKHMgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBidXR0b25zID0gcy5xdWVyeVNlbGVjdG9yQWxsKFwiYS5leGFtcGxlLWxpbmtcIilcbiAgICAgICAgICAgICAgY29uc3QgbGFzdEJ1dHRvbiA9IGJ1dHRvbnMuaXRlbShidXR0b25zLmxlbmd0aCAtIDEpIGFzIEhUTUxFbGVtZW50XG4gICAgICAgICAgICAgIGlmIChsYXN0QnV0dG9uKSB7XG4gICAgICAgICAgICAgICAgcmVkaXJlY3RUYWJQcmVzc1RvKGxhc3RCdXR0b24sIGV4YW1wbGVDb250YWluZXIsIFwiLmV4YW1wbGVzLWNsb3NlXCIpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9KVxuXG4gIC8vIEhhbmRsZSBlc2NhcGUgY2xvc2luZyBkcm9wZG93bnMgZXRjXG4gIGRvY3VtZW50Lm9ua2V5ZG93biA9IGZ1bmN0aW9uIChldnQpIHtcbiAgICBldnQgPSBldnQgfHwgd2luZG93LmV2ZW50XG4gICAgdmFyIGlzRXNjYXBlID0gZmFsc2VcbiAgICBpZiAoXCJrZXlcIiBpbiBldnQpIHtcbiAgICAgIGlzRXNjYXBlID0gZXZ0LmtleSA9PT0gXCJFc2NhcGVcIiB8fCBldnQua2V5ID09PSBcIkVzY1wiXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEB0cy1pZ25vcmUgLSB0aGlzIHVzZWQgdG8gYmUgdGhlIGNhc2VcbiAgICAgIGlzRXNjYXBlID0gZXZ0LmtleUNvZGUgPT09IDI3XG4gICAgfVxuICAgIGlmIChpc0VzY2FwZSkge1xuICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcIi5uYXZiYXItc3ViIGxpLm9wZW5cIikuZm9yRWFjaChpID0+IGkuY2xhc3NMaXN0LnJlbW92ZShcIm9wZW5cIikpXG4gICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLm5hdmJhci1zdWIgbGlcIikuZm9yRWFjaChpID0+IGkuc2V0QXR0cmlidXRlKFwiYXJpYS1leHBhbmRlZFwiLCBcImZhbHNlXCIpKVxuICAgIH1cbiAgfVxuXG4gIC8vIFNldCB1cCBzb21lIGtleSBjb21tYW5kc1xuICBzYW5kYm94LmVkaXRvci5hZGRBY3Rpb24oe1xuICAgIGlkOiBcImNvcHktY2xpcGJvYXJkXCIsXG4gICAgbGFiZWw6IFwiU2F2ZSB0byBjbGlwYm9hcmRcIixcbiAgICBrZXliaW5kaW5nczogW21vbmFjby5LZXlNb2QuQ3RybENtZCB8IG1vbmFjby5LZXlDb2RlLktFWV9TXSxcblxuICAgIGNvbnRleHRNZW51R3JvdXBJZDogXCJydW5cIixcbiAgICBjb250ZXh0TWVudU9yZGVyOiAxLjUsXG5cbiAgICBydW46IGZ1bmN0aW9uIChlZCkge1xuICAgICAgd2luZG93Lm5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGxvY2F0aW9uLmhyZWYudG9TdHJpbmcoKSkudGhlbihcbiAgICAgICAgKCkgPT4gdWkuZmxhc2hJbmZvKGkoXCJwbGF5X2V4cG9ydF9jbGlwYm9hcmRcIikpLFxuICAgICAgICAoZTogYW55KSA9PiBhbGVydChlKVxuICAgICAgKVxuICAgIH0sXG4gIH0pXG5cbiAgc2FuZGJveC5lZGl0b3IuYWRkQWN0aW9uKHtcbiAgICBpZDogXCJydW4tanNcIixcbiAgICBsYWJlbDogXCJSdW4gdGhlIGV2YWx1YXRlZCBKYXZhU2NyaXB0IGZvciB5b3VyIFR5cGVTY3JpcHQgZmlsZVwiLFxuICAgIGtleWJpbmRpbmdzOiBbbW9uYWNvLktleU1vZC5DdHJsQ21kIHwgbW9uYWNvLktleUNvZGUuRW50ZXJdLFxuXG4gICAgY29udGV4dE1lbnVHcm91cElkOiBcInJ1blwiLFxuICAgIGNvbnRleHRNZW51T3JkZXI6IDEuNSxcblxuICAgIHJ1bjogZnVuY3Rpb24gKGVkKSB7XG4gICAgICBjb25zdCBydW5CdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJ1bi1idXR0b25cIilcbiAgICAgIHJ1bkJ1dHRvbiAmJiBydW5CdXR0b24ub25jbGljayAmJiBydW5CdXR0b24ub25jbGljayh7fSBhcyBhbnkpXG4gICAgfSxcbiAgfSlcblxuICBjb25zdCBydW5CdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJ1bi1idXR0b25cIilcbiAgaWYgKHJ1bkJ1dHRvbikge1xuICAgIHJ1bkJ1dHRvbi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgY29uc3QgcnVuID0gc2FuZGJveC5nZXRSdW5uYWJsZUpTKClcbiAgICAgIGNvbnN0IHJ1blBsdWdpbiA9IHBsdWdpbnMuZmluZChwID0+IHAuaWQgPT09IFwibG9nc1wiKSFcbiAgICAgIGFjdGl2YXRlUGx1Z2luKHJ1blBsdWdpbiwgZ2V0Q3VycmVudFBsdWdpbigpLCBzYW5kYm94LCB0YWJCYXIsIGNvbnRhaW5lcilcblxuICAgICAgcnVuV2l0aEN1c3RvbUxvZ3MocnVuLCBpKVxuXG4gICAgICBjb25zdCBpc0pTID0gc2FuZGJveC5jb25maWcudXNlSmF2YVNjcmlwdFxuICAgICAgdWkuZmxhc2hJbmZvKGkoaXNKUyA/IFwicGxheV9ydW5fanNcIiA6IFwicGxheV9ydW5fdHNcIikpXG4gICAgfVxuICB9XG5cbiAgLy8gSGFuZGxlIHRoZSBjbG9zZSBidXR0b25zIG9uIHRoZSBleGFtcGxlc1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiYnV0dG9uLmV4YW1wbGVzLWNsb3NlXCIpLmZvckVhY2goYiA9PiB7XG4gICAgY29uc3QgYnV0dG9uID0gYiBhcyBIVE1MQnV0dG9uRWxlbWVudFxuICAgIGJ1dHRvbi5vbmNsaWNrID0gKGU6IGFueSkgPT4ge1xuICAgICAgY29uc3QgYnV0dG9uID0gZS50YXJnZXQgYXMgSFRNTEJ1dHRvbkVsZW1lbnRcbiAgICAgIGNvbnN0IG5hdkxJID0gYnV0dG9uLmNsb3Nlc3QoXCJsaVwiKVxuICAgICAgbmF2TEk/LmNsYXNzTGlzdC5yZW1vdmUoXCJvcGVuXCIpXG4gICAgfVxuICB9KVxuXG4gIHNldHVwU2lkZWJhclRvZ2dsZSgpXG5cbiAgaWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY29uZmlnLWNvbnRhaW5lclwiKSkge1xuICAgIGNyZWF0ZUNvbmZpZ0Ryb3Bkb3duKHNhbmRib3gsIG1vbmFjbylcbiAgICB1cGRhdGVDb25maWdEcm9wZG93bkZvckNvbXBpbGVyT3B0aW9ucyhzYW5kYm94LCBtb25hY28pXG4gIH1cblxuICBpZiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbGF5Z3JvdW5kLXNldHRpbmdzXCIpKSB7XG4gICAgY29uc3Qgc2V0dGluZ3NUb2dnbGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsYXlncm91bmQtc2V0dGluZ3NcIikhXG5cbiAgICBzZXR0aW5nc1RvZ2dsZS5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgY29uc3Qgb3BlbiA9IHNldHRpbmdzVG9nZ2xlLnBhcmVudEVsZW1lbnQhLmNsYXNzTGlzdC5jb250YWlucyhcIm9wZW5cIilcbiAgICAgIGNvbnN0IHNpZGViYXJUYWJzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5wbGF5Z3JvdW5kLXBsdWdpbi10YWJ2aWV3XCIpIGFzIEhUTUxEaXZFbGVtZW50XG4gICAgICBjb25zdCBzaWRlYmFyQ29udGVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIucGxheWdyb3VuZC1wbHVnaW4tY29udGFpbmVyXCIpIGFzIEhUTUxEaXZFbGVtZW50XG4gICAgICBsZXQgc2V0dGluZ3NDb250ZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5wbGF5Z3JvdW5kLXNldHRpbmdzLWNvbnRhaW5lclwiKSBhcyBIVE1MRGl2RWxlbWVudFxuXG4gICAgICBpZiAoIXNldHRpbmdzQ29udGVudCkge1xuICAgICAgICBzZXR0aW5nc0NvbnRlbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXG4gICAgICAgIHNldHRpbmdzQ29udGVudC5jbGFzc05hbWUgPSBcInBsYXlncm91bmQtc2V0dGluZ3MtY29udGFpbmVyIHBsYXlncm91bmQtcGx1Z2luLWNvbnRhaW5lclwiXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gc2V0dGluZ3NQbHVnaW4oaSwgdXRpbHMpXG4gICAgICAgIHNldHRpbmdzLmRpZE1vdW50ICYmIHNldHRpbmdzLmRpZE1vdW50KHNhbmRib3gsIHNldHRpbmdzQ29udGVudClcbiAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5wbGF5Z3JvdW5kLXNpZGViYXJcIikhLmFwcGVuZENoaWxkKHNldHRpbmdzQ29udGVudClcblxuICAgICAgICAvLyBXaGVuIHRoZSBsYXN0IHRhYiBpdGVtIGlzIGhpdCwgZ28gYmFjayB0byB0aGUgc2V0dGluZ3MgYnV0dG9uXG4gICAgICAgIGNvbnN0IGxhYmVscyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIucGxheWdyb3VuZC1zaWRlYmFyIGlucHV0XCIpXG4gICAgICAgIGNvbnN0IGxhc3RMYWJlbCA9IGxhYmVscy5pdGVtKGxhYmVscy5sZW5ndGggLSAxKSBhcyBIVE1MRWxlbWVudFxuICAgICAgICBpZiAobGFzdExhYmVsKSB7XG4gICAgICAgICAgcmVkaXJlY3RUYWJQcmVzc1RvKGxhc3RMYWJlbCwgdW5kZWZpbmVkLCBcIiNwbGF5Z3JvdW5kLXNldHRpbmdzXCIpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKG9wZW4pIHtcbiAgICAgICAgc2lkZWJhclRhYnMuc3R5bGUuZGlzcGxheSA9IFwiZmxleFwiXG4gICAgICAgIHNpZGViYXJDb250ZW50LnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCJcbiAgICAgICAgc2V0dGluZ3NDb250ZW50LnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIlxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2lkZWJhclRhYnMuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiXG4gICAgICAgIHNpZGViYXJDb250ZW50LnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIlxuICAgICAgICBzZXR0aW5nc0NvbnRlbnQuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIlxuICAgICAgICA7KGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIucGxheWdyb3VuZC1zaWRlYmFyIGxhYmVsXCIpIGFzIGFueSkuZm9jdXMoKVxuICAgICAgfVxuICAgICAgc2V0dGluZ3NUb2dnbGUucGFyZW50RWxlbWVudCEuY2xhc3NMaXN0LnRvZ2dsZShcIm9wZW5cIilcbiAgICB9XG4gIH1cblxuICAvLyBTdXBwb3J0IGdyYWJiaW5nIGV4YW1wbGVzIGZyb20gdGhlIGxvY2F0aW9uIGhhc2hcbiAgaWYgKGxvY2F0aW9uLmhhc2guc3RhcnRzV2l0aChcIiNleGFtcGxlXCIpKSB7XG4gICAgY29uc3QgZXhhbXBsZU5hbWUgPSBsb2NhdGlvbi5oYXNoLnJlcGxhY2UoXCIjZXhhbXBsZS9cIiwgXCJcIikudHJpbSgpXG4gICAgc2FuZGJveC5jb25maWcubG9nZ2VyLmxvZyhcIkxvYWRpbmcgZXhhbXBsZTpcIiwgZXhhbXBsZU5hbWUpXG4gICAgZ2V0RXhhbXBsZVNvdXJjZUNvZGUoY29uZmlnLnByZWZpeCwgY29uZmlnLmxhbmcsIGV4YW1wbGVOYW1lKS50aGVuKGV4ID0+IHtcbiAgICAgIGlmIChleC5leGFtcGxlICYmIGV4LmNvZGUpIHtcbiAgICAgICAgY29uc3QgeyBleGFtcGxlLCBjb2RlIH0gPSBleFxuXG4gICAgICAgIC8vIFVwZGF0ZSB0aGUgbG9jYWxzdG9yYWdlIHNob3dpbmcgdGhhdCB5b3UndmUgc2VlbiB0aGlzIHBhZ2VcbiAgICAgICAgaWYgKGxvY2FsU3RvcmFnZSkge1xuICAgICAgICAgIGNvbnN0IHNlZW5UZXh0ID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJleGFtcGxlcy1zZWVuXCIpIHx8IFwie31cIlxuICAgICAgICAgIGNvbnN0IHNlZW4gPSBKU09OLnBhcnNlKHNlZW5UZXh0KVxuICAgICAgICAgIHNlZW5bZXhhbXBsZS5pZF0gPSBleGFtcGxlLmhhc2hcbiAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcImV4YW1wbGVzLXNlZW5cIiwgSlNPTi5zdHJpbmdpZnkoc2VlbikpXG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgdGhlIG1lbnUgdG8gYmUgdGhlIHNhbWUgc2VjdGlvbiBhcyB0aGlzIGN1cnJlbnQgZXhhbXBsZVxuICAgICAgICAvLyB0aGlzIGhhcHBlbnMgYmVoaW5kIHRoZSBzY2VuZSBhbmQgaXNuJ3QgdmlzaWJsZSB0aWxsIHlvdSBob3ZlclxuICAgICAgICAvLyBjb25zdCBzZWN0aW9uVGl0bGUgPSBleGFtcGxlLnBhdGhbMF1cbiAgICAgICAgLy8gY29uc3QgYWxsU2VjdGlvblRpdGxlcyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ3NlY3Rpb24tbmFtZScpXG4gICAgICAgIC8vIGZvciAoY29uc3QgdGl0bGUgb2YgYWxsU2VjdGlvblRpdGxlcykge1xuICAgICAgICAvLyAgIGlmICh0aXRsZS50ZXh0Q29udGVudCA9PT0gc2VjdGlvblRpdGxlKSB7XG4gICAgICAgIC8vICAgICB0aXRsZS5vbmNsaWNrKHt9KVxuICAgICAgICAvLyAgIH1cbiAgICAgICAgLy8gfVxuXG4gICAgICAgIGNvbnN0IGFsbExpbmtzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcImV4YW1wbGUtbGlua1wiKVxuICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgIGZvciAoY29uc3QgbGluayBvZiBhbGxMaW5rcykge1xuICAgICAgICAgIGlmIChsaW5rLnRleHRDb250ZW50ID09PSBleGFtcGxlLnRpdGxlKSB7XG4gICAgICAgICAgICBsaW5rLmNsYXNzTGlzdC5hZGQoXCJoaWdobGlnaHRcIilcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBkb2N1bWVudC50aXRsZSA9IFwiVHlwZVNjcmlwdCBQbGF5Z3JvdW5kIC0gXCIgKyBleGFtcGxlLnRpdGxlXG4gICAgICAgIHNhbmRib3guc2V0VGV4dChjb2RlKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2FuZGJveC5zZXRUZXh0KFwiLy8gVGhlcmUgd2FzIGFuIGlzc3VlIGdldHRpbmcgdGhlIGV4YW1wbGUsIGJhZCBVUkw/IENoZWNrIHRoZSBjb25zb2xlIGluIHRoZSBkZXZlbG9wZXIgdG9vbHNcIilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgLy8gVGhpcyBpc24ndCBvcHRpbWFsLCBidXQgaXQncyBnb29kIGVub3VnaCB3aXRob3V0IG1lIGFkZGluZyBzdXBwb3J0XG4gIC8vIGZvciBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L21vbmFjby1lZGl0b3IvaXNzdWVzLzMxM1xuICBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgY29uc3QgbWFya2VycyA9IHNhbmRib3gubW9uYWNvLmVkaXRvci5nZXRNb2RlbE1hcmtlcnMoe30pXG4gICAgdXRpbHMuc2V0Tm90aWZpY2F0aW9ucyhcImVycm9yc1wiLCBtYXJrZXJzLmxlbmd0aClcbiAgfSwgNTAwKVxuXG4gIC8vIFNldHMgdXAgYSB3YXkgdG8gY2xpY2sgYmV0d2VlbiBleGFtcGxlc1xuICBtb25hY28ubGFuZ3VhZ2VzLnJlZ2lzdGVyTGlua1Byb3ZpZGVyKHNhbmRib3gubGFuZ3VhZ2UsIG5ldyBFeGFtcGxlSGlnaGxpZ2h0ZXIoKSlcblxuICBjb25zdCBsYW5ndWFnZVNlbGVjdG9yID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsYW5ndWFnZS1zZWxlY3RvclwiKSBhcyBIVE1MU2VsZWN0RWxlbWVudFxuICBpZiAobGFuZ3VhZ2VTZWxlY3Rvcikge1xuICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMobG9jYXRpb24uc2VhcmNoKVxuICAgIGxhbmd1YWdlU2VsZWN0b3Iub3B0aW9ucy5zZWxlY3RlZEluZGV4ID0gcGFyYW1zLmdldChcInVzZUphdmFTY3JpcHRcIikgPyAxIDogMFxuXG4gICAgbGFuZ3VhZ2VTZWxlY3Rvci5vbmNoYW5nZSA9ICgpID0+IHtcbiAgICAgIGNvbnN0IHVzZUphdmFTY3JpcHQgPSBsYW5ndWFnZVNlbGVjdG9yLnZhbHVlID09PSBcIkphdmFTY3JpcHRcIlxuICAgICAgY29uc3QgcXVlcnkgPSBzYW5kYm94LmNyZWF0ZVVSTFF1ZXJ5V2l0aENvbXBpbGVyT3B0aW9ucyhzYW5kYm94LCB7XG4gICAgICAgIHVzZUphdmFTY3JpcHQ6IHVzZUphdmFTY3JpcHQgPyB0cnVlIDogdW5kZWZpbmVkLFxuICAgICAgfSlcbiAgICAgIGNvbnN0IGZ1bGxVUkwgPSBgJHtkb2N1bWVudC5sb2NhdGlvbi5wcm90b2NvbH0vLyR7ZG9jdW1lbnQubG9jYXRpb24uaG9zdH0ke2RvY3VtZW50LmxvY2F0aW9uLnBhdGhuYW1lfSR7cXVlcnl9YFxuICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgZG9jdW1lbnQubG9jYXRpb24gPSBmdWxsVVJMXG4gICAgfVxuICB9XG5cbiAgY29uc3QgdWkgPSBjcmVhdGVVSSgpXG4gIGNvbnN0IGV4cG9ydGVyID0gY3JlYXRlRXhwb3J0ZXIoc2FuZGJveCwgbW9uYWNvLCB1aSlcblxuICBjb25zdCBwbGF5Z3JvdW5kID0ge1xuICAgIGV4cG9ydGVyLFxuICAgIHVpLFxuICAgIHJlZ2lzdGVyUGx1Z2luLFxuICAgIHBsdWdpbnMsXG4gICAgZ2V0Q3VycmVudFBsdWdpbixcbiAgICB0YWJzLFxuICAgIHNldERpZFVwZGF0ZVRhYixcbiAgICBjcmVhdGVVdGlscyxcbiAgfVxuXG4gIHdpbmRvdy50cyA9IHNhbmRib3gudHNcbiAgd2luZG93LnNhbmRib3ggPSBzYW5kYm94XG4gIHdpbmRvdy5wbGF5Z3JvdW5kID0gcGxheWdyb3VuZFxuXG4gIGNvbnNvbGUubG9nKGBVc2luZyBUeXBlU2NyaXB0ICR7d2luZG93LnRzLnZlcnNpb259YClcblxuICBjb25zb2xlLmxvZyhcIkF2YWlsYWJsZSBnbG9iYWxzOlwiKVxuICBjb25zb2xlLmxvZyhcIlxcdHdpbmRvdy50c1wiLCB3aW5kb3cudHMpXG4gIGNvbnNvbGUubG9nKFwiXFx0d2luZG93LnNhbmRib3hcIiwgd2luZG93LnNhbmRib3gpXG4gIGNvbnNvbGUubG9nKFwiXFx0d2luZG93LnBsYXlncm91bmRcIiwgd2luZG93LnBsYXlncm91bmQpXG4gIGNvbnNvbGUubG9nKFwiXFx0d2luZG93LnJlYWN0XCIsIHdpbmRvdy5yZWFjdClcbiAgY29uc29sZS5sb2coXCJcXHR3aW5kb3cucmVhY3RET01cIiwgd2luZG93LnJlYWN0RE9NKVxuXG4gIC8qKiBBIHBsdWdpbiAqL1xuICBjb25zdCBhY3RpdmF0ZUV4dGVybmFsUGx1Z2luID0gKFxuICAgIHBsdWdpbjogUGxheWdyb3VuZFBsdWdpbiB8ICgodXRpbHM6IFBsdWdpblV0aWxzKSA9PiBQbGF5Z3JvdW5kUGx1Z2luKSxcbiAgICBhdXRvQWN0aXZhdGU6IGJvb2xlYW5cbiAgKSA9PiB7XG4gICAgbGV0IHJlYWR5UGx1Z2luOiBQbGF5Z3JvdW5kUGx1Z2luXG4gICAgLy8gQ2FuIGVpdGhlciBiZSBhIGZhY3RvcnksIG9yIG9iamVjdFxuICAgIGlmICh0eXBlb2YgcGx1Z2luID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIGNvbnN0IHV0aWxzID0gY3JlYXRlVXRpbHMoc2FuZGJveCwgcmVhY3QpXG4gICAgICByZWFkeVBsdWdpbiA9IHBsdWdpbih1dGlscylcbiAgICB9IGVsc2Uge1xuICAgICAgcmVhZHlQbHVnaW4gPSBwbHVnaW5cbiAgICB9XG5cbiAgICBpZiAoYXV0b0FjdGl2YXRlKSB7XG4gICAgICBjb25zb2xlLmxvZyhyZWFkeVBsdWdpbilcbiAgICB9XG5cbiAgICBwbGF5Z3JvdW5kLnJlZ2lzdGVyUGx1Z2luKHJlYWR5UGx1Z2luKVxuXG4gICAgLy8gQXV0by1zZWxlY3QgdGhlIGRldiBwbHVnaW5cbiAgICBjb25zdCBwbHVnaW5XYW50c0Zyb250ID0gcmVhZHlQbHVnaW4uc2hvdWxkQmVTZWxlY3RlZCAmJiByZWFkeVBsdWdpbi5zaG91bGRCZVNlbGVjdGVkKClcblxuICAgIGlmIChwbHVnaW5XYW50c0Zyb250IHx8IGF1dG9BY3RpdmF0ZSkge1xuICAgICAgLy8gQXV0by1zZWxlY3QgdGhlIGRldiBwbHVnaW5cbiAgICAgIGFjdGl2YXRlUGx1Z2luKHJlYWR5UGx1Z2luLCBnZXRDdXJyZW50UGx1Z2luKCksIHNhbmRib3gsIHRhYkJhciwgY29udGFpbmVyKVxuICAgIH1cbiAgfVxuXG4gIC8vIERldiBtb2RlIHBsdWdpblxuICBpZiAoY29uZmlnLnN1cHBvcnRDdXN0b21QbHVnaW5zICYmIGFsbG93Q29ubmVjdGluZ1RvTG9jYWxob3N0KCkpIHtcbiAgICB3aW5kb3cuZXhwb3J0cyA9IHt9XG4gICAgY29uc29sZS5sb2coXCJDb25uZWN0aW5nIHRvIGRldiBwbHVnaW5cIilcbiAgICB0cnkge1xuICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgY29uc3QgcmUgPSB3aW5kb3cucmVxdWlyZVxuICAgICAgcmUoW1wibG9jYWwvaW5kZXhcIl0sIChkZXZQbHVnaW46IGFueSkgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlNldCB1cCBkZXYgcGx1Z2luIGZyb20gbG9jYWxob3N0OjUwMDBcIilcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhY3RpdmF0ZUV4dGVybmFsUGx1Z2luKGRldlBsdWdpbiwgdHJ1ZSlcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKVxuICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdWkuZmxhc2hJbmZvKFwiRXJyb3I6IENvdWxkIG5vdCBsb2FkIGRldiBwbHVnaW4gZnJvbSBsb2NhbGhvc3Q6NTAwMFwiKVxuICAgICAgICAgIH0sIDcwMClcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcihcIlByb2JsZW0gbG9hZGluZyB1cCB0aGUgZGV2IHBsdWdpblwiKVxuICAgICAgY29uc29sZS5lcnJvcihlcnJvcilcbiAgICB9XG4gIH1cblxuICBjb25zdCBkb3dubG9hZFBsdWdpbiA9IChwbHVnaW46IHN0cmluZywgYXV0b0VuYWJsZTogYm9vbGVhbikgPT4ge1xuICAgIHRyeSB7XG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICBjb25zdCByZSA9IHdpbmRvdy5yZXF1aXJlXG4gICAgICByZShbYHVucGtnLyR7cGx1Z2lufUBsYXRlc3QvZGlzdC9pbmRleGBdLCAoZGV2UGx1Z2luOiBQbGF5Z3JvdW5kUGx1Z2luKSA9PiB7XG4gICAgICAgIGFjdGl2YXRlRXh0ZXJuYWxQbHVnaW4oZGV2UGx1Z2luLCBhdXRvRW5hYmxlKVxuICAgICAgfSlcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcihcIlByb2JsZW0gbG9hZGluZyB1cCB0aGUgcGx1Z2luOlwiLCBwbHVnaW4pXG4gICAgICBjb25zb2xlLmVycm9yKGVycm9yKVxuICAgIH1cbiAgfVxuXG4gIGlmIChjb25maWcuc3VwcG9ydEN1c3RvbVBsdWdpbnMpIHtcbiAgICAvLyBHcmFiIG9uZXMgZnJvbSBsb2NhbHN0b3JhZ2VcbiAgICBhY3RpdmVQbHVnaW5zKCkuZm9yRWFjaChwID0+IGRvd25sb2FkUGx1Z2luKHAubW9kdWxlLCBmYWxzZSkpXG5cbiAgICAvLyBPZmZlciB0byBpbnN0YWxsIG9uZSBpZiAnaW5zdGFsbC1wbHVnaW4nIGlzIGEgcXVlcnkgcGFyYW1cbiAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKGxvY2F0aW9uLnNlYXJjaClcbiAgICBjb25zdCBwbHVnaW5Ub0luc3RhbGwgPSBwYXJhbXMuZ2V0KFwiaW5zdGFsbC1wbHVnaW5cIilcbiAgICBpZiAocGx1Z2luVG9JbnN0YWxsKSB7XG4gICAgICBjb25zdCBhbHJlYWR5SW5zdGFsbGVkID0gYWN0aXZlUGx1Z2lucygpLmZpbmQocCA9PiBwLm1vZHVsZSA9PT0gcGx1Z2luVG9JbnN0YWxsKVxuICAgICAgaWYgKCFhbHJlYWR5SW5zdGFsbGVkKSB7XG4gICAgICAgIGNvbnN0IHNob3VsZERvSXQgPSBjb25maXJtKFwiV291bGQgeW91IGxpa2UgdG8gaW5zdGFsbCB0aGUgdGhpcmQgcGFydHkgcGx1Z2luP1xcblxcblwiICsgcGx1Z2luVG9JbnN0YWxsKVxuICAgICAgICBpZiAoc2hvdWxkRG9JdCkge1xuICAgICAgICAgIGFkZEN1c3RvbVBsdWdpbihwbHVnaW5Ub0luc3RhbGwpXG4gICAgICAgICAgZG93bmxvYWRQbHVnaW4ocGx1Z2luVG9JbnN0YWxsLCB0cnVlKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKGxvY2F0aW9uLmhhc2guc3RhcnRzV2l0aChcIiNzaG93LWV4YW1wbGVzXCIpKSB7XG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImV4YW1wbGVzLWJ1dHRvblwiKT8uY2xpY2soKVxuICAgIH0sIDEwMClcbiAgfVxuXG4gIGlmIChsb2NhdGlvbi5oYXNoLnN0YXJ0c1dpdGgoXCIjc2hvdy13aGF0aXNuZXdcIikpIHtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwid2hhdGlzbmV3LWJ1dHRvblwiKT8uY2xpY2soKVxuICAgIH0sIDEwMClcbiAgfVxuXG4gIHJldHVybiBwbGF5Z3JvdW5kXG59XG5cbmV4cG9ydCB0eXBlIFBsYXlncm91bmQgPSBSZXR1cm5UeXBlPHR5cGVvZiBzZXR1cFBsYXlncm91bmQ+XG5cbmNvbnN0IHJlZGlyZWN0VGFiUHJlc3NUbyA9IChlbGVtZW50OiBIVE1MRWxlbWVudCwgY29udGFpbmVyOiBIVE1MRWxlbWVudCB8IHVuZGVmaW5lZCwgcXVlcnk6IHN0cmluZykgPT4ge1xuICAvLyBlbGVtZW50LnN0eWxlLmJhY2tncm91bmRDb2xvciA9IFwicmVkXCJcbiAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBlID0+IHtcbiAgICBpZiAoZS5rZXlDb2RlID09PSA5KSB7XG4gICAgICBjb25zdCBob3N0ID0gY29udGFpbmVyIHx8IGRvY3VtZW50XG4gICAgICBjb25zdCByZXN1bHQgPSBob3N0LnF1ZXJ5U2VsZWN0b3IocXVlcnkpIGFzIGFueVxuICAgICAgaWYgKCFyZXN1bHQpIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgdG8gZmluZCBhIHJlc3VsdCBmb3Iga2V5ZG93bmApXG4gICAgICByZXN1bHQuZm9jdXMoKVxuICAgICAgY29uc29sZS5sb2cocmVzdWx0KVxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgfVxuICB9KVxufVxuIl19