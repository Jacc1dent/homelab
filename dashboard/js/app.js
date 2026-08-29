/* ============================================================
   HOMELAB DASHBOARD
   UI Controller
   Version: 0.2.0-dev
   ============================================================ */


document.addEventListener("DOMContentLoaded", () => {

    console.log(
        "%cHOMELAB DASHBOARD // UI INITIALIZED",
        "color: #3fb950; font-weight: bold;"
    );


    /* ========================================================
       ELEMENTS
    ======================================================== */

    const sidebar =
        document.querySelector(".sidebar");

    const navLinks =
        document.querySelectorAll(".nav-link");

    const systemState =
        document.querySelector(".system-state");

    const terminalOutput =
        document.querySelector(".terminal-output");


    if (!sidebar) {

        console.error(
            "HOMELAB // Sidebar element not found."
        );

        return;

    }


    /* ========================================================
       TOAST NOTIFICATIONS
    ======================================================== */

    function showToast(message) {

        let toast =
            document.querySelector(
                ".dashboard-toast"
            );


        if (!toast) {

            toast =
                document.createElement("div");

            toast.className =
                "dashboard-toast";

            document.body.appendChild(toast);

        }


        toast.innerHTML =
            `<strong>HOMELAB //</strong> ${message}`;


        toast.classList.add("visible");


        clearTimeout(
            toast.hideTimeout
        );


        toast.hideTimeout =
            setTimeout(() => {

                toast.classList.remove(
                    "visible"
                );

            }, 3000);

    }


    /* ========================================================
       MOBILE SIDEBAR
    ======================================================== */

    const mobileMenuButton =
        document.createElement("button");


    mobileMenuButton.className =
        "mobile-menu-button";


    mobileMenuButton.type =
        "button";


    mobileMenuButton.innerHTML =
        "☰";


    mobileMenuButton.setAttribute(
        "aria-label",
        "Open navigation"
    );


    mobileMenuButton.setAttribute(
        "aria-expanded",
        "false"
    );


    document.body.appendChild(
        mobileMenuButton
    );



    const sidebarBackdrop =
        document.createElement("div");


    sidebarBackdrop.className =
        "sidebar-backdrop";


    document.body.appendChild(
        sidebarBackdrop
    );



    function openSidebar() {

        sidebar.classList.add("open");

        sidebarBackdrop.classList.add(
            "visible"
        );

        mobileMenuButton.innerHTML =
            "×";

        mobileMenuButton.setAttribute(
            "aria-expanded",
            "true"
        );

    }



    function closeSidebar() {

        sidebar.classList.remove("open");

        sidebarBackdrop.classList.remove(
            "visible"
        );

        mobileMenuButton.innerHTML =
            "☰";

        mobileMenuButton.setAttribute(
            "aria-expanded",
            "false"
        );

    }



    mobileMenuButton.addEventListener(
        "click",
        () => {

            if (
                sidebar.classList.contains(
                    "open"
                )
            ) {

                closeSidebar();

            } else {

                openSidebar();

            }

        }
    );



    sidebarBackdrop.addEventListener(
        "click",
        closeSidebar
    );



    document.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Escape") {

                closeSidebar();

            }

        }
    );


    /* ========================================================
       NAVIGATION
    ======================================================== */

    function setActiveNav(sectionId) {

        navLinks.forEach((link) => {

            const target =
                link.getAttribute("href");


            if (target === `#${sectionId}`) {

                link.classList.add("active");

            } else {

                link.classList.remove("active");

            }

        });

    }



    navLinks.forEach((link) => {

        link.addEventListener(
            "click",
            (event) => {

                const targetSelector =
                    link.getAttribute("href");


                if (
                    !targetSelector ||
                    !targetSelector.startsWith("#")
                ) {

                    return;

                }


                event.preventDefault();


                const target =
                    document.querySelector(
                        targetSelector
                    );


                /*
                 * Module has not been built yet.
                 */

                if (!target) {

                    const moduleName =
                        link.textContent.trim();


                    showToast(
                        `${moduleName} module is not available yet.`
                    );


                    closeSidebar();

                    return;

                }


                /*
                 * Immediately update sidebar state.
                 */

                setActiveNav(
                    target.id
                );


                /*
                 * Scroll to dashboard module.
                 */

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });


                /*
                 * Update URL without reloading.
                 */

                history.pushState(
                    null,
                    "",
                    targetSelector
                );


                closeSidebar();

            }
        );

    });


    /* ========================================================
       SCROLL SPY

       Updates sidebar navigation as the user manually scrolls.
    ======================================================== */

    const sections = [];


    navLinks.forEach((link) => {

        const selector =
            link.getAttribute("href");


        if (
            !selector ||
            !selector.startsWith("#")
        ) {

            return;

        }


        const section =
            document.querySelector(selector);


        if (section) {

            sections.push(section);

        }

    });



    let scrollTicking =
        false;



    function updateNavigationFromScroll() {

        const activationPoint =
            170;


        let currentSection =
            sections[0];


        sections.forEach((section) => {

            const sectionTop =
                section.getBoundingClientRect().top;


            if (
                sectionTop <= activationPoint
            ) {

                currentSection =
                    section;

            }

        });


        if (currentSection) {

            setActiveNav(
                currentSection.id
            );

        }


        scrollTicking =
            false;

    }



    window.addEventListener(
        "scroll",
        () => {

            if (!scrollTicking) {

                requestAnimationFrame(
                    updateNavigationFromScroll
                );

                scrollTicking =
                    true;

            }

        }
    );


    /* ========================================================
       LIVE CLOCK
    ======================================================== */

    function formatClock(date) {

        return date.toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );

    }



    if (systemState) {

        const stateContainer =
            systemState.querySelector("div");


        if (stateContainer) {

            const clock =
                document.createElement("span");


            clock.className =
                "runtime-clock";


            stateContainer.appendChild(clock);


            function updateClock() {

                clock.textContent =
                    formatClock(
                        new Date()
                    );

            }


            updateClock();


            setInterval(
                updateClock,
                1000
            );

        }

    }


    /* ========================================================
       VIEW ALL MACHINES
    ======================================================== */

    const viewMachinesButton =
        document.querySelector(
            ".text-button"
        );


    if (viewMachinesButton) {

        viewMachinesButton.addEventListener(
            "click",
            () => {

                showToast(
                    "Machine management module is planned for a future version."
                );

            }
        );

    }


    /* ========================================================
       TERMINAL STARTUP MESSAGE
    ======================================================== */

    if (terminalOutput) {

        const terminalInput =
            terminalOutput.querySelector(
                ".terminal-input"
            );


        if (terminalInput) {

            const logLine =
                document.createElement("p");


            const time =
                document.createElement("span");


            time.className =
                "log-time";


            time.textContent =
                formatClock(
                    new Date()
                );


            const status =
                document.createElement("span");


            status.className =
                "log-info";


            status.textContent =
                "[INFO]";


            const message =
                document.createTextNode(
                    " UI controller initialized"
                );


            logLine.appendChild(time);

            logLine.appendChild(status);

            logLine.appendChild(message);


            terminalOutput.insertBefore(
                logLine,
                terminalInput
            );

        }

    }


    /* ========================================================
       INITIAL PAGE STATE
    ======================================================== */

    if (window.location.hash) {

        const initialTarget =
            document.querySelector(
                window.location.hash
            );


        if (initialTarget) {

            setActiveNav(
                initialTarget.id
            );

        }

    } else {

        setActiveNav(
            "overview"
        );

    }


    updateNavigationFromScroll();


    console.log(
        "HOMELAB // Mobile navigation ready"
    );

    console.log(
        `HOMELAB // ${sections.length} dashboard sections registered`
    );

});