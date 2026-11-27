/**
 * Nazmul Chat
 * Main application module
 */

import {
    Navigation,
    getNavigationItems,
    setupNavigation
} from "./navigation.js";

export const AppSections = Object.freeze({
    HOME: "home",
    CHAT: "chat",
    CALLS: "calls",
    CONTACTS: "contacts",
    SETTINGS: "settings"
});

export function getAppSections() {
    return Object.values(AppSections);
}

export const NazmulChatApp = {
    name: "Nazmul Chat",
    version: "1.0.0",

    init() {
        console.log(
            "Nazmul Chat app structure initialized."
        );

        console.log(
            "Navigation items:",
            getNavigationItems()
        );

        console.log(
            "Navigation:",
            Navigation
        );

        setupNavigation((section) => {
            console.log(
                "Active app section:",
                section
            );

            document.body.dataset.activeSection =
                section;
                document.getElementById("homeSection").style.display =
    section === "home" ? "block" : "none";

            document.querySelectorAll(
                "#appNavigation [data-section]"
            ).forEach((button) => {
                button.classList.toggle(
                    "active",
                    button.dataset.section === section
                );
            });
        });
    }
};