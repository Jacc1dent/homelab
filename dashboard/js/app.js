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

// ============================================================
// GLOBAL HOMELAB HEALTH STATE
// ============================================================

const homelabHealth = {
    containers: null,
    services: null,
    targets: null,
    machines: null,
    resources: null
};


// ============================================================
// OVERALL SYSTEM STATUS
// ============================================================

function updateSystemStatus() {
    const dot =
        document.getElementById("system-status-dot");

    const text =
        document.getElementById("system-status-text");

    if (!dot || !text) {
        return;
    }


    dot.classList.remove(
        "online",
        "offline",
        "planned"
    );

    text.classList.remove(
        "online-text",
        "warning-text",
        "offline-text"
    );


    const {
        containers,
        services,
        targets,
        machines,
        resources
    } = homelabHealth;


    // Wait until all three APIs have reported in.
    if (
        containers === null ||
        services === null ||
        targets === null ||
        machines === null ||
        resources === null
    ) {
        dot.classList.add("planned");
        text.classList.add("warning-text");

        text.textContent = "CHECKING";

        return;
    }


    // ========================================================
    // DOWN
    // ========================================================

    const systemDown =
        containers.running === 0 ||
        services.running === 0 ||
        targets.online === 0 ||
        machines.online === 0;


    if (systemDown) {
        dot.classList.add("offline");
        text.classList.add("offline-text");

        text.textContent = "DOWN";

        return;
    }


    // ========================================================
    // DEGRADED
    // ========================================================

    const systemDegraded =
        containers.running < containers.total ||
        services.running < services.total ||
        targets.online < targets.expected ||
        machines.online < machines.total ||
        resources.warning === true ||
        resources.critical === true;


    if (systemDegraded) {
        dot.classList.add("planned");
        text.classList.add("warning-text");

        text.textContent = "DEGRADED";

        return;
    }


    // ========================================================
    // ONLINE
    // ========================================================

    dot.classList.add("online");
    text.classList.add("online-text");

    text.textContent = "ONLINE";
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

// ============================================================
// GLOBAL HOMELAB HEALTH STATE
// ============================================================

const homelabHealth = {
    containers: null,
    targets: null,
    machines: null
};


// ============================================================
// OVERALL SYSTEM STATUS
// ============================================================

function updateSystemStatus() {
    const dot =
        document.getElementById("system-status-dot");

    const text =
        document.getElementById("system-status-text");

    if (!dot || !text) {
        return;
    }

    dot.classList.remove(
        "online",
        "offline",
        "planned"
    );

    text.classList.remove(
        "online-text",
        "warning-text",
        "offline-text"
    );


    const {
        containers,
        services,
        targets,
        machines,
        resources
    } = homelabHealth;


    // Still waiting for API data
    if (
        containers === null ||
        targets === null ||
        machines === null
    ) {
        dot.classList.add("planned");
        text.classList.add("warning-text");

        text.textContent = "CHECKING";

        return;
    }


    // ========================================================
    // DOWN
    // ========================================================

    const systemDown =
        containers.running === 0 ||
        targets.online === 0 ||
        machines.online === 0;


    if (systemDown) {
        dot.classList.add("offline");
        text.classList.add("offline-text");

        text.textContent = "DOWN";

        return;
    }


    // ========================================================
    // DEGRADED
    // ========================================================

    const systemDegraded =
        containers.running < containers.total ||
        targets.online < targets.expected ||
        machines.online < machines.total;


    if (systemDegraded) {
        dot.classList.add("planned");
        text.classList.add("warning-text");

        text.textContent = "DEGRADED";

        return;
    }


    // ========================================================
    // ONLINE
    // ========================================================

    dot.classList.add("online");
    text.classList.add("online-text");

    text.textContent = "ONLINE";
}

// ============================================================
// LIVE CONTAINER STATUS
// ============================================================

async function updateContainerStatus() {
    const countElement =
        document.getElementById("container-count");

    const statusElement =
        document.getElementById("container-status");

    if (!countElement || !statusElement) {
        console.warn("Container status elements not found");
        return;
    }

    try {
        const response = await fetch(
            "/api/containers",
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `Container API returned ${response.status}`
            );
        }

        const data = await response.json();

        homelabHealth.containers = {
            running: data.running,
            total: data.total
        };

        updateSystemStatus();

        countElement.textContent =
            data.total;

        statusElement.textContent =
            `${data.running} / ${data.total} running`;

        statusElement.classList.remove(
            "online-text",
            "warning-text",
            "offline-text"
        );

        if (data.running === data.total) {
            statusElement.classList.add(
                "online-text"
            );

        } else if (data.running > 0) {
            statusElement.classList.add(
                "warning-text"
            );

        } else {
            statusElement.classList.add(
                "offline-text"
            );
        }

    } catch (error) {
        console.error(
            "Failed to load container status:",
            error
        );

        countElement.textContent =
            "--";

        statusElement.textContent =
            "Container API unavailable";

        statusElement.classList.remove(
            "online-text",
            "warning-text"
        );

        statusElement.classList.add(
            "offline-text"
        );

        homelabHealth.containers = null;

        updateSystemStatus();
    }
}

// ============================================================
// LIVE SERVICE STATUS
// ============================================================

function setServiceStatus(
    card,
    running
) {
    const dot =
        card.querySelector(
            ".service-status-dot"
        );

    const text =
        card.querySelector(
            ".service-status-text"
        );


    if (!dot || !text) {
        return;
    }


    dot.classList.remove(
        "online",
        "offline",
        "planned"
    );

    text.classList.remove(
        "online-text",
        "warning-text",
        "offline-text"
    );


    if (running === true) {

        dot.classList.add(
            "online"
        );

        text.classList.add(
            "online-text"
        );

        text.textContent =
            "RUNNING";

    } else if (running === false) {

        dot.classList.add(
            "offline"
        );

        text.classList.add(
            "offline-text"
        );

        text.textContent =
            "DOWN";

    } else {

        dot.classList.add(
            "planned"
        );

        text.classList.add(
            "warning-text"
        );

        text.textContent =
            "UNKNOWN";
    }
}


async function updateServices() {

    const countElement =
        document.getElementById(
            "service-count"
        );

    const statusElement =
        document.getElementById(
            "service-status-summary"
        );


    if (!countElement || !statusElement) {
        console.warn(
            "Service overview elements not found"
        );

        return;
    }


    try {

        const response = await fetch(
            "/api/services",
            {
                cache: "no-store"
            }
        );


        if (!response.ok) {
            throw new Error(
                `Services API returned ${response.status}`
            );
        }


        const data =
            await response.json();


        // ----------------------------------------------------
        // Feed overall health
        // ----------------------------------------------------

        homelabHealth.services = {
            running: data.running,
            total: data.total
        };

        updateSystemStatus();


        // ----------------------------------------------------
        // Overview card
        // ----------------------------------------------------

        countElement.textContent =
            data.total;

        statusElement.textContent =
            `${data.running} / ${data.total} currently running`;


        statusElement.classList.remove(
            "online-text",
            "warning-text",
            "offline-text"
        );


        if (data.running === data.total) {

            statusElement.classList.add(
                "online-text"
            );

        } else if (data.running > 0) {

            statusElement.classList.add(
                "warning-text"
            );

        } else {

            statusElement.classList.add(
                "offline-text"
            );
        }


        // ----------------------------------------------------
        // Individual service cards
        // ----------------------------------------------------

        for (
            const [serviceName, running]
            of Object.entries(data.services)
        ) {

            const card =
                document.querySelector(
                    `[data-service="${serviceName}"]`
                );


            if (!card) {
                console.warn(
                    `No service card found for ${serviceName}`
                );

                continue;
            }


            setServiceStatus(
                card,
                running
            );
        }

    } catch (error) {

        console.error(
            "Failed to load service status:",
            error
        );


        countElement.textContent =
            "--";

        statusElement.textContent =
            "Service API unavailable";


        statusElement.classList.remove(
            "online-text",
            "warning-text"
        );

        statusElement.classList.add(
            "offline-text"
        );


        homelabHealth.services =
            null;

        updateSystemStatus();
    }
}


// ============================================================
// FORMATTERS
// ============================================================

function formatPercent(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "--";
    }

    return `${Number(value).toFixed(1)}%`;
}


function formatUptime(seconds) {
    if (
        seconds === null ||
        seconds === undefined
    ) {
        return "--";
    }

    const days =
        Math.floor(seconds / 86400);

    const hours =
        Math.floor(
            (seconds % 86400) / 3600
        );

    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );

    if (days > 0) {
        return `${days}d ${hours}h`;
    }

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
}

// ============================================================
// METRIC SEVERITY
// ============================================================

function applyMetricSeverity(
    element,
    value,
    warningThreshold,
    criticalThreshold
) {
    if (!element) {
        return;
    }

    // Remove any old severity colour first.
    element.classList.remove(
        "warning-text",
        "offline-text"
    );


    // No data = leave the normal/default colour.
    if (
        value === null ||
        value === undefined ||
        Number.isNaN(Number(value))
    ) {
        return;
    }


    const numericValue = Number(value);


    // Critical
    if (numericValue >= criticalThreshold) {
        element.classList.add(
            "offline-text"
        );

        return;
    }


    // Warning
    if (numericValue >= warningThreshold) {
        element.classList.add(
            "warning-text"
        );
    }
}


// ============================================================
// MACHINE STATUS
// ============================================================

function setMachineStatus(dot, text, online) {
    if (!dot || !text) {
        return;
    }

    dot.classList.remove(
        "online",
        "offline",
        "planned"
    );

    text.classList.remove(
        "online-text",
        "offline-text",
        "planned-text"
    );

    if (online === true) {
        dot.classList.add("online");
        text.classList.add("online-text");
        text.textContent = "ONLINE";

    } else if (online === false) {
        dot.classList.add("offline");
        text.classList.add("offline-text");
        text.textContent = "OFFLINE";

    } else {
        dot.classList.add("planned");
        text.classList.add("planned-text");
        text.textContent = "UNKNOWN";
    }
}


// ============================================================
// LIVE INFRASTRUCTURE METRICS
// ============================================================

async function updateMetrics() {
    const gamingCpu =
        document.getElementById("gaming-cpu");

    const gamingRam =
        document.getElementById("gaming-ram");

    const gamingDisk =
        document.getElementById("gaming-disk");

    const gamingUptime =
        document.getElementById("gaming-uptime");


    const dnsCpu =
        document.getElementById("dns-cpu");

    const dnsRam =
        document.getElementById("dns-ram");

    const dnsDisk =
        document.getElementById("dns-disk");

    const dnsUptime =
        document.getElementById("dns-uptime");


    const targets =
        document.getElementById("prometheus-targets");

    const metricsStatus =
        document.getElementById("metrics-status");


    const gamingStatusDot =
        document.getElementById("gaming-status-dot");

    const gamingStatusText =
        document.getElementById("gaming-status-text");

    const dnsStatusDot =
        document.getElementById("dns-status-dot");

    const dnsStatusText =
        document.getElementById("dns-status-text");

    const hostStatusSummary =
        document.getElementById("host-status-summary");


    if (
        !gamingCpu ||
        !gamingRam ||
        !gamingDisk ||
        !gamingUptime ||
        !dnsCpu ||
        !dnsRam ||
        !dnsDisk ||
        !dnsUptime ||
        !targets ||
        !metricsStatus
    ) {
        console.error(
            "One or more metric HTML elements are missing"
        );

        return;
    }


    try {
        const response = await fetch("/api/metrics", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(
                `Metrics API returned ${response.status}`
            );
        }

        const data = await response.json();

        const resourceWarning =
            data.gaming_pc.cpu_percent >= 70 ||
            data.gaming_pc.ram_percent >= 70 ||
            data.gaming_pc.disk_percent >= 80 ||
            data.homelab_dns.cpu_percent >= 70 ||
            data.homelab_dns.ram_percent >= 70 ||
            data.homelab_dns.disk_percent >= 80;


        const resourceCritical =
            data.gaming_pc.cpu_percent >= 90 ||
            data.gaming_pc.ram_percent >= 90 ||
            data.gaming_pc.disk_percent >= 90 ||
            data.homelab_dns.cpu_percent >= 90 ||
            data.homelab_dns.ram_percent >= 90 ||
            data.homelab_dns.disk_percent >= 90;


        homelabHealth.resources = {
            warning: resourceWarning,
            critical: resourceCritical
        };

        updateSystemStatus();

        homelabHealth.targets = {
            online: data.targets.online,
            expected: data.targets.expected
        };

        const machineStates = [
            data.gaming_pc.online,
            data.homelab_dns.online
        ];

        homelabHealth.machines = {
            online: machineStates.filter(
                state => state === true
            ).length,

            total: machineStates.length
        };

        updateSystemStatus();



        // Gaming PC
        gamingCpu.textContent =
            formatPercent(data.gaming_pc.cpu_percent);

        gamingRam.textContent =
            formatPercent(data.gaming_pc.ram_percent);

        gamingDisk.textContent =
            formatPercent(data.gaming_pc.disk_percent);

        gamingUptime.textContent =
            formatUptime(data.gaming_pc.uptime_seconds);

        // ----------------------------------------------------
        // GAMING PC SEVERITY
        // ----------------------------------------------------

        applyMetricSeverity(
            gamingCpu,
            data.gaming_pc.cpu_percent,
            70,
            90
        );

        applyMetricSeverity(
            gamingRam,
            data.gaming_pc.ram_percent,
            70,
            90
        );

        applyMetricSeverity(
            gamingDisk,
            data.gaming_pc.disk_percent,
            80,
            90
        );


        // DNS server
        dnsCpu.textContent =
            formatPercent(data.homelab_dns.cpu_percent);

        dnsRam.textContent =
            formatPercent(data.homelab_dns.ram_percent);

        dnsDisk.textContent =
            formatPercent(data.homelab_dns.disk_percent);

        dnsUptime.textContent =
            formatUptime(data.homelab_dns.uptime_seconds);


        // ----------------------------------------------------
        // HOMELAB DNS SEVERITY
        // ----------------------------------------------------

        applyMetricSeverity(
            dnsCpu,
            data.homelab_dns.cpu_percent,
            70,
            90
        );

        applyMetricSeverity(
            dnsRam,
            data.homelab_dns.ram_percent,
            70,
            90
        );

        applyMetricSeverity(
            dnsDisk,
            data.homelab_dns.disk_percent,
            80,
            90
        );


        // Prometheus
        targets.textContent =
            `${data.targets.online} / ${data.targets.expected}`;


        // Machine status
        setMachineStatus(
            gamingStatusDot,
            gamingStatusText,
            data.gaming_pc.online
        );

        setMachineStatus(
            dnsStatusDot,
            dnsStatusText,
            data.homelab_dns.online
        );


        // Overview host summary
        if (hostStatusSummary) {
            const states = [
                data.gaming_pc.online,
                data.homelab_dns.online
            ];

            const onlineCount =
                states.filter(
                    value => value === true
                ).length;

            hostStatusSummary.textContent =
                `${onlineCount} infrastructure nodes online / 1 planned`;
        }


        // Metrics status
        metricsStatus.textContent = "LIVE";

        metricsStatus.classList.remove(
            "planned-text",
            "offline-text"
        );

        metricsStatus.classList.add(
            "online-text"
        );

    } catch (error) {
        homelabHealth.targets = null;
        homelabHealth.machines = null;

        updateSystemStatus();
    }
}


// ============================================================
// INITIAL LOAD
// ============================================================

updateContainerStatus();
updateMetrics();
updateServices();


// ============================================================
// POLLING
// ============================================================

setInterval(
    updateContainerStatus,
    30000
);

setInterval(
    updateMetrics,
    15000
);

setInterval(
    updateServices,
    15000
);

