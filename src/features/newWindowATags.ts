export function modifyLinkBehavior(){
    chrome.storage.local.get(["moreTargetBlank"], (result) => {
        const resourceLinks = document.querySelectorAll("a.aalink.stretched-link[onclick]");
        console.log("Recource links: ", resourceLinks);
        if(resourceLinks.length == 0) return;

        resourceLinks.forEach((item: HTMLAnchorElement) => {
            if (item.href && item.href.startsWith("http") && !item.target
                && (result.moreTargetBlank === "all" || item.href.includes("learnit.itu.dk") === false)) {
                item.setAttribute("target", "_blank");
            }
            item.removeAttribute("onclick");
            item.setAttribute("href", item.getAttribute("href") + "&redirect=1");
        });
        
        
        if (!result.moreTargetBlank || result.moreTargetBlank === "off") return;

        const links = document.querySelectorAll<HTMLAnchorElement>(".summarytext a");
        links.forEach((link) => {
            if (link.href && link.href.startsWith("http") && !link.target
                && (result.moreTargetBlank === "all" || link.href.includes("learnit.itu.dk") === false)) {
                link.target = "_blank";
                link.rel = "noopener noreferrer";
            }
        });
    });
}