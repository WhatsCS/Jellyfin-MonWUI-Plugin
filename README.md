<h1 align="center">Jellyfin MonWUI — WhatsCS Fork</h1>

<p align="center">
  <img src="https://github.com/user-attachments/assets/29947627-b2ff-4ecd-8a2b-4df932aca657" alt="JMSFusionV2 logo" width="200" />
</p>

<p align="center">
  A modular UI upgrade for Jellyfin that introduces a cinematic home slider, richer metadata,
  hover previews, profile personalization, GMMP music playback, Netflix-style pause and details views,
  studio hubs, notifications, parental PIN control, and a centralized settings experience.
</p>

<p align="center">
  <a href="https://github.com/WhatsCS/Jellyfin-MonWUI-Plugin/blob/main/LICENSE">
    <img
      alt="License"
      src="https://img.shields.io/badge/License-GPLv3-7c3aed?style=for-the-badge"
    />
  </a>
</p>

---

> [!NOTE]
> **This is an independent fork, not the original project.**
> MonWUI / JMSFusion was created by [G-grbz](https://github.com/G-grbz).
> This repository builds on that work with changes by [WhatsCS](https://github.com/WhatsCS) and fork contributors, and is displayed in Jellyfin as **JMSFusionV2**.
> Fork changes and releases are separate from upstream; attribution does not imply endorsement by the original developer.

**Original project:** [G-grbz/Jellyfin-MonWUI-Plugin](https://github.com/G-grbz/Jellyfin-MonWUI-Plugin) · **This fork:** [WhatsCS/Jellyfin-MonWUI-Plugin](https://github.com/WhatsCS/Jellyfin-MonWUI-Plugin)

Please report issues with this fork to [this repository's issue tracker](https://github.com/WhatsCS/Jellyfin-MonWUI-Plugin/issues), rather than asking the original developer to support fork-specific changes.

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#client-compatibility">Client Compatibility</a> •
  <a href="#highlights">Highlights</a> •
  <a href="#core-modules">Core Modules</a> •
  <a href="docs/technical-overview.md">Technical Guide</a> •
  <a href="docs/seerr-arr-integration.md">Seerr & Arr Integration</a> •
  <a href="#uninstall">Uninstall</a> •
  <a href="#acknowledgment">Acknowledgment</a> •
  <a href="#license">License</a>
</p>

---

## Overview

**Jellyfin MonWUI Plugin** is a frontend enhancement layer originally developed by **G-grbz**. This fork, displayed in Jellyfin as **JMSFusionV2**, builds on its modular slider system and broader Jellyfin Web enhancements.

Rather than applying a single visual modification, JMSFusionV2 expands the Jellyfin Web experience across home screen presentation, metadata, hover interactions, profile management, music playback, pause behavior, library discovery, notifications, and centralized UI configuration.

The features described below include work inherited from the original project; they are not a list of features newly created by this fork.

---

## Client Compatibility

JMSFusionV2 works by injecting JavaScript and CSS into the **Jellyfin Web UI**.

### Compatible clients

* Web browsers using Jellyfin Web
* Mobile clients that embed the Jellyfin Web interface, including:

  * **Jellyfin for Android**
  * **Jellyfin for iOS**

### Not compatible

* **Jellyfin for Android TV**
* Native TV clients that do not load the server's `jellyfin-web` frontend
* Other clients using an independent native interface

In short, if a client does not render the server's `/web/index.html`, JMSFusionV2 cannot modify its interface.

Compatibility with newer Jellyfin server or client releases is not guaranteed.

---

## Highlights

| Area               | What it adds                                                                                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Home screen**    | User-specific slider lists, automatic row refresh, custom API query control, manual positioning, and Compact, Normal, Full Screen, and Peak slider layouts |
| **Discovery**      | Details overlays, hover trailers, compact popover previews, personal recommendations, genre/director/recent rows, and studio hubs                          |
| **Metadata**       | Quality badges, ratings, maturity indicators, richer information blocks, cast/director data, subtitle and language information, and provider links         |
| **Profiles**       | Netflix-style profile chooser, avatar generation, built-in avatar selection, and profile-specific customization                                            |
| **Playback**       | GMMP music player, lyrics support, subtitle customization, Netflix-style pause screen, parental PIN control, and Smart Pause                               |
| **Administration** | Centralized configuration, multilingual UI, backup/restore utilities, notifications, and admin-level controls                                              |

---

## Core Modules

* **Slider engine**

  * Per-profile list control
  * Random or manual content sourcing
  * Custom API queries
  * Content balancing rules
  * Automatic refresh logic

* **Visual layouts**

  * Compact
  * Normal
  * Full Screen
  * Peak
  * Optional diagonal presentation
  * Manual positioning controls

* **Home enhancements**

  * Cinematic hero presentation
  * Enhanced details views
  * Personal recommendations
  * Metadata-rich content cards
  * Custom home sections

* **Hover preview system**

  * Trailer playback
  * Lightweight popover previews
  * Expanded metadata presentation

* **Playback enhancements**

  * Smart Pause
  * Metadata overlays
  * GMMP music playback
  * Lyrics support
  * Subtitle customization
  * Parental PIN control

* **Profile personalization**

  * Netflix-style profile selection
  * Avatar generation
  * Built-in avatar library
  * Fast profile switching
  * Profile-specific preferences

* **Library and discovery**

  * Studio hubs
  * Watchlist integration
  * Genre and director discovery
  * Recently added content sections
  * Notification system

* **Trailer utilities**

  * Trailer downloading through `yt-dlp`
  * Trailer integration through NFO metadata
  * Hover video support

* **Advanced utilities**

  * Backup and restore
  * Multilingual interface
  * Centralized settings
  * Administrative controls

---

## Uninstall

For existing installations:

1. Open **Jellyfin Dashboard**
2. Go to **Plugins**
3. Uninstall **JMSFusionV2**
4. Restart Jellyfin
5. Hard refresh the Jellyfin Web interface using **Ctrl + F5** or **Ctrl + Shift + R**

If browser-cached JMSFusionV2 assets remain visible after uninstalling, clear the Jellyfin site's cached data and reload the page.

---

## Acknowledgment

- **[G-grbz](https://github.com/G-grbz)** — original creator and developer of [MonWUI / JMSFusion](https://github.com/G-grbz/Jellyfin-MonWUI-Plugin), whose work forms the foundation of this fork.
- **[Upstream contributors](https://github.com/G-grbz/Jellyfin-MonWUI-Plugin/graphs/contributors)** — contributions to the original project.
- **[BobHasNoSoul](https://github.com/BobHasNoSoul)** — creator of the original **JMS slider concept**, as acknowledged by upstream.
- **[WhatsCS](https://github.com/WhatsCS) and [fork contributors](https://github.com/WhatsCS/Jellyfin-MonWUI-Plugin/graphs/contributors)** — changes made in this independent fork.

Credit for the original project remains with its authors. Fork attribution covers fork contributions, not ownership of the upstream work.

---

## License

This fork continues under the original project's **GNU General Public License v3.0**. It does not relicense the upstream work or replace its authorship.

The license text in [LICENSE](LICENSE) is unchanged. Existing copyright and attribution notices remain applicable; third-party components retain their respective licenses and notices.

When redistributing this project or modified versions, comply with the GPLv3 terms, including preserving required notices, identifying modifications, and providing corresponding source as required by the license.

---

## Disclaimer

This software is provided **"as is"**, without warranty of any kind.

Use at your own risk.
