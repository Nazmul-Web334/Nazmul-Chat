export const Navigation = Object.freeze({
    HOME: "home",
    CHAT: "chat",
    CALLS: "calls",
    CONTACTS: "contacts",
    SETTINGS: "settings"
});

export function getNavigationItems() {
    return Object.values(Navigation);
};
export function setupNavigation(onNavigate) {
    const buttons = document.querySelectorAll(
        "#appNavigation [data-section]"
    );

    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            const section = button.dataset.section;

            buttons.forEach((item) => {
                item.classList.toggle("active", item === button);
            });

            if (typeof onNavigate === "function") {
                onNavigate(section);
            }

            console.log("Selected section:", section);
        });
    });
}