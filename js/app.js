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
    version: "1.1.0",

    init() {

        console.log("Nazmul Chat initialized.");

        console.log("Navigation items:", getNavigationItems());

        const sections = {
            home: document.getElementById("homeSection"),
            chat: document.getElementById("chatSection"),
            calls: document.getElementById("callsSection"),
            contacts: document.getElementById("contactsSection"),
            settings: document.getElementById("settingsSection")
        };

        setupNavigation((section) => {

            Object.entries(sections).forEach(([name, element]) => {

                if (element) {
                    element.style.display =
                        name === section ? "block" : "none";
                }

            });

            console.log("Active section:", section);

        });

        // প্রথমে Home দেখাবে
        Object.entries(sections).forEach(([name, element]) => {

            if (element) {
                element.style.display =
                    name === "home" ? "block" : "none";
            }

        });

    }

};