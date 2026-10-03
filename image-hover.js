document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("img").forEach(image => {
        image.classList.add("cursor-follow-image");

        image.addEventListener("pointermove", event => {
            if (event.pointerType !== "mouse") return;

            const bounds = image.getBoundingClientRect();
            if (!bounds.width || !bounds.height) return;

            const horizontalPosition = (event.clientX - bounds.left) / bounds.width - 0.5;
            const verticalPosition = (event.clientY - bounds.top) / bounds.height - 0.5;
            image.style.setProperty("--cursor-follow-x", `${-horizontalPosition * 10}px`);
            image.style.setProperty("--cursor-follow-y", `${-verticalPosition * 8}px`);
        });

        image.addEventListener("pointerleave", () => {
            image.style.setProperty("--cursor-follow-x", "0px");
            image.style.setProperty("--cursor-follow-y", "0px");
        });
    });
});