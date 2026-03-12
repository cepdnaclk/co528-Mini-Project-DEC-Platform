#!/usr/bin/env python3
"""
DECP Platform – CO528 Architecture Report Generator
Generates architecture diagrams + full Word document report
"""

import os
import sys
import tempfile
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch
import matplotlib.patheffects as pe
import numpy as np

# ─── Paths ────────────────────────────────────────────────────────────────────
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(REPO, 'docs')
OUT  = os.path.join(DOCS, 'report')
os.makedirs(OUT, exist_ok=True)

IMG_DIR = os.path.join(OUT, 'diagrams')
os.makedirs(IMG_DIR, exist_ok=True)

# ─── Colour palette ───────────────────────────────────────────────────────────
C = {
    'bg':      '#FAFAFA',
    'teal':    '#0D7377',
    'teal_l':  '#14A085',
    'teal_bg': '#E0F2F1',
    'blue':    '#1565C0',
    'blue_l':  '#1976D2',
    'blue_bg': '#E3F2FD',
    'amber':   '#E65100',
    'amber_l': '#F57C00',
    'amber_bg':'#FFF3E0',
    'green':   '#2E7D32',
    'green_bg':'#E8F5E9',
    'purple':  '#6A1B9A',
    'purple_bg':'#F3E5F5',
    'red':     '#B71C1C',
    'red_bg':  '#FFEBEE',
    'grey':    '#455A64',
    'grey_l':  '#78909C',
    'grey_bg': '#ECEFF1',
    'white':   '#FFFFFF',
    'border':  '#B0BEC5',
}

def save(fig, name):
    path = os.path.join(IMG_DIR, name)
    fig.savefig(path, dpi=180, bbox_inches='tight', facecolor=C['bg'])
    plt.close(fig)
    print(f'  ✓ {name}')
    return path


def box(ax, x, y, w, h, label, sub=None, bg='#E3F2FD', border='#1976D2',
        fontsize=9, subfontsize=7.5, bold=True):
    rect = FancyBboxPatch((x - w/2, y - h/2), w, h,
                          boxstyle='round,pad=0.04', linewidth=1.2,
                          edgecolor=border, facecolor=bg, zorder=3)
    ax.add_patch(rect)
    weight = 'bold' if bold else 'normal'
    ty = y + (h * 0.12 if sub else 0)
    ax.text(x, ty, label, ha='center', va='center', fontsize=fontsize,
            fontweight=weight, color=border, zorder=4, wrap=True,
            multialignment='center')
    if sub:
        ax.text(x, y - h * 0.22, sub, ha='center', va='center',
                fontsize=subfontsize, color=C['grey'], zorder=4,
                multialignment='center')


def arrow(ax, x0, y0, x1, y1, color='#455A64', lw=1.2, style='->', label='',
          labelpos=0.5, labelfontsize=6.5, dashed=False):
    ls = '--' if dashed else '-'
    ax.annotate('', xy=(x1, y1), xytext=(x0, y0),
                arrowprops=dict(arrowstyle=style, color=color, lw=lw,
                                linestyle=ls, connectionstyle='arc3,rad=0'),
                zorder=2)
    if label:
        mx = x0 + (x1 - x0) * labelpos
        my = y0 + (y1 - y0) * labelpos + 0.015
        ax.text(mx, my, label, ha='center', va='bottom',
                fontsize=labelfontsize, color=color, zorder=5,
                bbox=dict(boxstyle='round,pad=0.1', fc=C['bg'], ec='none', alpha=0.8))


# ══════════════════════════════════════════════════════════════════════════════
# DIAGRAM 1 – SOA / Service Interaction
# ══════════════════════════════════════════════════════════════════════════════
def diagram_soa():
    fig, ax = plt.subplots(figsize=(18, 12))
    ax.set_xlim(0, 18); ax.set_ylim(0, 12)
    ax.axis('off')
    fig.patch.set_facecolor(C['bg'])
    ax.set_facecolor(C['bg'])

    ax.text(9, 11.6, 'DECP Platform – SOA Service Interaction Diagram',
            ha='center', va='top', fontsize=14, fontweight='bold', color=C['teal'])
    ax.text(9, 11.2, 'Synchronous HTTP (REST) + Asynchronous Pub/Sub event bus',
            ha='center', va='top', fontsize=9, color=C['grey'])

    # ── Clients
    box(ax, 2, 10.4, 2.2, 0.7, 'Web Client', 'Next.js 14 :4000',
        C['green_bg'], C['green'])
    box(ax, 4.6, 10.4, 2.2, 0.7, 'Mobile Client', 'React Native / Expo',
        C['green_bg'], C['green'])

    # ── Gateway
    box(ax, 9, 9.0, 3.0, 0.9, 'API Gateway', ':8082  JWT validate · CORS · Rate-limit',
        C['teal_bg'], C['teal'], fontsize=10)

    # ── Realtime
    box(ax, 15.5, 9.0, 2.2, 0.8, 'Realtime Service', 'Socket.IO :3010',
        C['purple_bg'], C['purple'])

    # Clients → Gateway
    arrow(ax, 2, 10.05, 7.6, 9.35, C['green'], 1.4, label='HTTPS REST')
    arrow(ax, 4.6, 10.05, 7.6, 9.1, C['green'], 1.4)
    # Clients → Realtime WS
    ax.annotate('', xy=(14.4, 9.3), xytext=(4.6, 10.05),
                arrowprops=dict(arrowstyle='->', color=C['purple'], lw=1.2,
                                connectionstyle='arc3,rad=-0.3'), zorder=2)
    ax.text(9.5, 10.1, 'WebSocket', ha='center', fontsize=7, color=C['purple'])

    # ── Services row 1
    services_r1 = [
        (2.0, 6.8, 'Auth', ':3001', C['blue_bg'], C['blue']),
        (5.0, 6.8, 'User', ':3002', C['blue_bg'], C['blue']),
        (8.0, 6.8, 'Feed', ':3003', C['blue_bg'], C['blue']),
        (11.0, 6.8, 'Jobs', ':3004', C['blue_bg'], C['blue']),
        (14.0, 6.8, 'Events', ':3005', C['blue_bg'], C['blue']),
    ]
    # ── Services row 2
    services_r2 = [
        (2.5, 4.8, 'Messaging', ':3006', C['amber_bg'], C['amber']),
        (6.0, 4.8, 'Notification', ':3007', C['amber_bg'], C['amber']),
        (9.5, 4.8, 'Analytics', ':3008', C['amber_bg'], C['amber']),
        (13.0, 4.8, 'Research', ':3009', C['amber_bg'], C['amber']),
    ]

    for x, y, name, port, bg, col in services_r1 + services_r2:
        box(ax, x, y, 2.4, 0.75, name, port, bg, col, fontsize=9)

    # Gateway → services (row1)
    for x, y, *_ in services_r1:
        arrow(ax, x, 8.55, x, y + 0.38, C['teal'], 1.0)

    # Gateway → services (row2) via dashed
    for x, y, *_ in services_r2:
        arrow(ax, 9, 8.55, x, y + 0.38, C['teal'], 0.8, dashed=True)

    # ── Pub/Sub emulator
    box(ax, 9, 3.0, 3.0, 0.9, 'Pub/Sub Emulator', ':8085  Topics: user.registered\npost.created · job.posted · event.rsvp',
        C['amber_bg'], C['amber_l'], fontsize=8.5, subfontsize=7)

    # Publishers → PubSub (row1 services that publish)
    pub_sources = [(8.0, 4.43), (11.0, 4.43), (14.0, 4.43)]  # feed, jobs, events
    for px, py in pub_sources:
        arrow(ax, px, py, 9, 3.45, C['amber_l'], 0.9, dashed=True, label='publish')

    # Pub/Sub → Subscribers
    sub_targets = [(6.0, 5.18), (9.5, 5.18)]  # notification, analytics
    for sx, sy in sub_targets:
        arrow(ax, 9, 2.55, sx, sy, C['amber_l'], 0.9, dashed=True, label='push')

    # Realtime ← services (emit events)
    arrow(ax, 14.2, 9.0, 14.4, 9.0, C['purple'], 0.8)
    ax.text(14.8, 8.7, 'POST /emit', fontsize=6.5, color=C['purple'])

    # ── MongoDB
    box(ax, 9, 1.4, 3.0, 0.75, 'MongoDB', 'Docker container  :27017',
        C['grey_bg'], C['grey'])
    for x, y, *_ in services_r1 + services_r2:
        arrow(ax, x, y - 0.38, 9, 1.78, C['grey_l'], 0.5, dashed=True)

    # ── Cloudflare R2
    box(ax, 15.5, 6.5, 2.2, 0.75, 'Cloudflare R2', 'Media CDN',
        C['green_bg'], C['green'])
    arrow(ax, 8.0, 6.43, 14.4, 6.5, C['green'], 0.9, label='presigned PUT', dashed=True)

    # ── Legend
    legend_items = [
        mpatches.Patch(fc=C['green_bg'], ec=C['green'], label='Client'),
        mpatches.Patch(fc=C['teal_bg'], ec=C['teal'], label='Gateway'),
        mpatches.Patch(fc=C['blue_bg'], ec=C['blue'], label='Core Service'),
        mpatches.Patch(fc=C['amber_bg'], ec=C['amber'], label='Event/Data Service'),
        mpatches.Patch(fc=C['purple_bg'], ec=C['purple'], label='Realtime (WS)'),
    ]
    ax.legend(handles=legend_items, loc='lower left', fontsize=8,
              framealpha=0.9, edgecolor=C['border'])

    return save(fig, 'diagram_soa.png')


# ══════════════════════════════════════════════════════════════════════════════
# DIAGRAM 2 – Enterprise Architecture
# ══════════════════════════════════════════════════════════════════════════════
def diagram_enterprise():
    fig, ax = plt.subplots(figsize=(16, 11))
    ax.set_xlim(0, 16); ax.set_ylim(0, 11)
    ax.axis('off')
    fig.patch.set_facecolor(C['bg'])
    ax.set_facecolor(C['bg'])

    ax.text(8, 10.65, 'DECP Platform – Enterprise Architecture',
            ha='center', fontsize=14, fontweight='bold', color=C['teal'])
    ax.text(8, 10.25, 'University Department Engagement Platform — Stakeholders, Domains & Workflows',
            ha='center', fontsize=9, color=C['grey'])

    # ── Draw a rounded rectangle border for each domain layer
    def domain_bg(x, y, w, h, label, color):
        rect = FancyBboxPatch((x, y), w, h,
                              boxstyle='round,pad=0.15', linewidth=2,
                              edgecolor=color, facecolor=color + '22', zorder=1,
                              alpha=0.5)
        ax.add_patch(rect)
        ax.text(x + w/2, y + h - 0.15, label, ha='center', va='top',
                fontsize=9, fontweight='bold', color=color)

    # ── User roles (left column)
    ax.text(1.5, 9.6, 'Stakeholders', ha='center', fontsize=10,
            fontweight='bold', color=C['teal'])
    roles = [
        (1.5, 8.7, 'Student', 'Browse · Apply · RSVP\nPost · Message', C['blue_bg'], C['blue']),
        (1.5, 7.2, 'Alumni', 'Post Jobs · Mentor\nResearch · Network', C['teal_bg'], C['teal']),
        (1.5, 5.7, 'Admin /\nDept Staff', 'Create Events\nManage Users\nAnalytics', C['amber_bg'], C['amber']),
    ]
    for x, y, name, cap, bg, col in roles:
        box(ax, x, y, 2.4, 1.0, name, cap, bg, col, fontsize=9, subfontsize=7.5)

    # ── Domain modules (centre)
    domain_bg(3.4, 0.4, 9.2, 9.4, '', '#90A4AE')

    modules = [
        # row 1
        (5.0, 8.3, 'Social Feed', 'Posts · Likes\nComments · Media', C['blue_bg'], C['blue']),
        (8.0, 8.3, 'User Management', 'Register · Profile\nFollow · Search', C['teal_bg'], C['teal']),
        (11.0, 8.3, 'Notifications', 'In-App · Push\nEvent-driven', C['purple_bg'], C['purple']),
        # row 2
        (5.0, 6.5, 'Jobs & Internships', 'Post · Apply\nAccept / Reject', C['amber_bg'], C['amber']),
        (8.0, 6.5, 'Events', 'Create · RSVP\nAnnouncements', C['amber_bg'], C['amber']),
        (11.0, 6.5, 'Messaging', 'Direct Chat\nRead Receipts', C['green_bg'], C['green']),
        # row 3
        (5.0, 4.7, 'Research', 'Projects\nCollaboration', C['blue_bg'], C['blue']),
        (8.0, 4.7, 'Analytics', 'Usage Metrics\nAdmin Dashboard', C['grey_bg'], C['grey']),
        (11.0, 4.7, 'Media Storage', 'R2 CDN\nPresigned Upload', C['green_bg'], C['green']),
        # row 4 – cross-cutting
        (6.5, 2.8, 'Authentication &\nAuthorisation', 'JWT · RBAC · Refresh', C['red_bg'], C['red']),
        (10.5, 2.8, 'Pub/Sub\nEvent Bus', 'Async Events\nDecoupled Services', C['amber_bg'], C['amber_l']),
    ]
    for x, y, name, cap, bg, col in modules:
        box(ax, x, y, 2.4, 1.0, name, cap, bg, col, fontsize=8.5, subfontsize=7.5)

    ax.text(7.9, 1.85, '── Cross-cutting Infrastructure Layer ──', ha='center',
            fontsize=8, color=C['grey'], style='italic')

    # ── External systems (right column)
    ax.text(14.5, 9.6, 'External', ha='center', fontsize=10,
            fontweight='bold', color=C['teal'])
    externals = [
        (14.5, 8.5, 'Cloudflare R2', 'Object Storage\nCDN', C['green_bg'], C['green']),
        (14.5, 7.0, 'Firebase FCM', 'Mobile Push\nNotifications', C['amber_bg'], C['amber']),
        (14.5, 5.5, 'AWS EC2', 'Docker Cluster\nt3.medium', C['grey_bg'], C['grey']),
        (14.5, 4.0, 'Vercel', 'Web Frontend\nAuto Deploy', C['blue_bg'], C['blue']),
    ]
    for x, y, name, cap, bg, col in externals:
        box(ax, x, y, 2.2, 0.9, name, cap, bg, col, fontsize=8.5, subfontsize=7.5)

    # ── Arrows: roles → modules
    for rx, ry, *_ in roles:
        arrow(ax, rx + 1.2, ry, 3.5, ry, C['grey_l'], 0.9)

    # Modules → externals
    arrow(ax, 11.0 + 1.2, 4.7, 13.4, 5.0, C['green'], 0.8, dashed=True)
    arrow(ax, 11.0 + 1.2, 6.5, 13.4, 8.0, C['green'], 0.8, dashed=True, label='R2')
    arrow(ax, 11.0 + 1.2, 6.5, 13.4, 7.0, C['amber_l'], 0.8, dashed=True, label='FCM')

    return save(fig, 'diagram_enterprise.png')


# ══════════════════════════════════════════════════════════════════════════════
# DIAGRAM 3 – Product Modularity
# ══════════════════════════════════════════════════════════════════════════════
def diagram_product():
    fig, ax = plt.subplots(figsize=(16, 10))
    ax.set_xlim(0, 16); ax.set_ylim(0, 10)
    ax.axis('off')
    fig.patch.set_facecolor(C['bg'])
    ax.set_facecolor(C['bg'])

    ax.text(8, 9.65, 'DECP Platform – Product Modularity Diagram',
            ha='center', fontsize=14, fontweight='bold', color=C['teal'])
    ax.text(8, 9.25, 'Core services · Optional enhancements · Shared libraries · Client integration',
            ha='center', fontsize=9, color=C['grey'])

    # ── Zone backgrounds
    def zone(x, y, w, h, title, color):
        r = FancyBboxPatch((x, y), w, h, boxstyle='round,pad=0.2',
                           linewidth=2, edgecolor=color, facecolor=color + '18', zorder=1)
        ax.add_patch(r)
        ax.text(x + w/2, y + h - 0.05, title, ha='center', va='top',
                fontsize=10, fontweight='bold', color=color)

    zone(0.2, 5.5, 7.5, 3.7, '● Core Features  (Must Have)', C['teal'])
    zone(8.2, 5.5, 7.5, 3.7, '○ Optional / Enhanced Features', C['grey_l'])
    zone(0.2, 1.0, 7.5, 4.2, '⚙ Shared Infrastructure', C['blue'])
    zone(8.2, 1.0, 7.5, 4.2, '↔ Client Integration Layer', C['green'])

    # ── Core features
    core = [
        (1.7, 8.2, 'User Auth', 'Register / Login\nJWT + Refresh'),
        (4.2, 8.2, 'Social Feed', 'Post · Like\nComment · Media'),
        (6.7, 8.2, 'Notifications', 'In-App\nPub/Sub driven'),
        (1.7, 6.7, 'Jobs Board', 'Post · Apply\nManage'),
        (4.2, 6.7, 'Events', 'Create\nRSVP'),
        (6.7, 6.7, 'Messaging', 'Direct Chat\nRead Receipts'),
    ]
    for x, y, name, cap in core:
        box(ax, x, y, 2.2, 0.9, name, cap, C['teal_bg'], C['teal'], fontsize=8.5)

    # ── Optional features
    opt = [
        (9.7, 8.2, 'Research\nProjects', 'Collaboration\nStatus Updates'),
        (12.2, 8.2, 'Analytics\nDashboard', 'Active users\nJob metrics'),
        (14.7, 8.2, 'Admin\nPanel', 'User mgmt\nContent mod'),
        (9.7, 6.7, 'Follow\nSystem', 'Follow / Unfollow\nFeed filtering'),
        (12.2, 6.7, 'FCM Push\nNotifs', 'Mobile Push\n(Firebase)'),
        (14.7, 6.7, 'Mentorship\nMatching', 'Alumni↔Student\nPairing (future)'),
    ]
    for x, y, name, cap in opt:
        box(ax, x, y, 2.2, 0.9, name, cap, C['grey_bg'], C['grey_l'], fontsize=8.5)

    # ── Shared infrastructure
    shared = [
        (1.7, 4.0, 'lib/internalClient.js', 'Axios + x-internal-token\nAll services'),
        (4.2, 4.0, 'lib/pubsub.js', 'Pub/Sub publisher\nAll event sources'),
        (6.7, 4.0, 'lib/r2.js', 'S3 presigned URLs\nFeed + User services'),
        (2.9, 2.3, 'MongoDB Mongoose\nModels', 'User · Post · Job\nEvent · Message'),
        (5.8, 2.3, 'API Gateway\nMiddleware', 'JWT · CORS · Rate\nProxy routing'),
    ]
    for x, y, name, cap in shared:
        box(ax, x, y, 2.2, 0.9, name, cap, C['blue_bg'], C['blue'], fontsize=8)

    # ── Client integration
    clients = [
        (9.7, 4.0, 'web/src/lib/api.ts', 'Axios + token refresh\ninceptor queue'),
        (12.2, 4.0, 'web/src/lib/socket.ts', 'Socket.IO client\nPresence + events'),
        (14.7, 4.0, 'web/src/store/', 'Zustand auth store\nPersisted tokens'),
        (9.7, 2.3, 'mobile/lib/api.ts', 'Same REST contract\nAsyncStorage tokens'),
        (12.2, 2.3, 'mobile/lib/socket.ts', 'Socket.IO mobile\nPresence sync'),
        (14.7, 2.3, 'Shared REST API\n/api/v1/', 'Web + Mobile\nconsume same URLs'),
    ]
    for x, y, name, cap in clients:
        box(ax, x, y, 2.2, 0.9, name, cap, C['green_bg'], C['green'], fontsize=8)

    # ── Reusability arrows (shared → core)
    ax.annotate('', xy=(4.0, 5.5), xytext=(3.5, 4.45),
                arrowprops=dict(arrowstyle='->', color=C['blue'], lw=1.1,
                                connectionstyle='arc3,rad=0'), zorder=2)
    ax.text(2.2, 5.1, 'shared lib\nused by all', ha='center',
            fontsize=7, color=C['blue'], style='italic')

    ax.annotate('', xy=(12.0, 5.5), xytext=(12.2, 4.45),
                arrowprops=dict(arrowstyle='->', color=C['green'], lw=1.1,
                                connectionstyle='arc3,rad=0'), zorder=2)
    ax.text(13.8, 5.1, 'client libs\nwrap API', ha='center',
            fontsize=7, color=C['green'], style='italic')

    # ── API Gateway separator
    ax.plot([7.85, 7.85], [1.0, 9.2], '--', color=C['border'], lw=1, zorder=0)

    return save(fig, 'diagram_product.png')


# ══════════════════════════════════════════════════════════════════════════════
# DIAGRAM 4 – Deployment
# ══════════════════════════════════════════════════════════════════════════════
def diagram_deployment():
    fig, ax = plt.subplots(figsize=(18, 12))
    ax.set_xlim(0, 18); ax.set_ylim(0, 12)
    ax.axis('off')
    fig.patch.set_facecolor(C['bg'])
    ax.set_facecolor(C['bg'])

    ax.text(9, 11.65, 'DECP Platform – Deployment Architecture',
            ha='center', fontsize=14, fontweight='bold', color=C['teal'])
    ax.text(9, 11.25, 'AWS EC2 t3.medium · Vercel · Cloudflare R2 · GitHub Actions CI/CD',
            ha='center', fontsize=9, color=C['grey'])

    def zone(x, y, w, h, title, color):
        r = FancyBboxPatch((x, y), w, h, boxstyle='round,pad=0.25',
                           linewidth=2.5, edgecolor=color, facecolor=color + '15', zorder=1)
        ax.add_patch(r)
        ax.text(x + 0.25, y + h - 0.12, title, ha='left', va='top',
                fontsize=9, fontweight='bold', color=color)

    # ── Zones
    zone(0.2, 0.4, 5.0, 4.8, '[ Developer Machine ]', C['grey_l'])
    zone(6.0, 0.4, 11.6, 10.5, '[ Cloud Infrastructure ]', C['teal'])
    zone(6.3, 1.0, 8.8, 9.4, '[ AWS EC2 t3.medium — Ubuntu 22.04 ]', C['blue'])
    zone(15.4, 5.5, 2.1, 3.8, '[ Vercel ]', C['green'])
    zone(15.4, 1.0, 2.1, 4.2, '[ Cloudflare ]', C['amber'])

    # ── GitHub Actions
    box(ax, 2.7, 4.4, 4.0, 0.8, 'GitHub Actions', 'Push to main → auto deploy via SSH',
        C['grey_bg'], C['grey_l'], fontsize=9)
    box(ax, 2.7, 3.2, 3.0, 0.7, 'GitHub Repo', 'Source + Secrets (11)',
        C['grey_bg'], C['grey_l'], fontsize=8.5)
    arrow(ax, 2.7, 4.0, 2.7, 3.55, C['grey_l'], 1.0, label='on push')
    arrow(ax, 4.7, 4.2, 6.2, 4.2, C['grey_l'], 1.3, label='SSH deploy')

    # ── Docker containers inside EC2
    containers = [
        # row1
        (7.8, 9.0, 'decp-gateway', ':8082', C['teal_bg'], C['teal']),
        (10.3, 9.0, 'decp-auth', ':3001', C['blue_bg'], C['blue']),
        (12.8, 9.0, 'decp-user', ':3002', C['blue_bg'], C['blue']),
        # row2
        (7.8, 7.5, 'decp-feed', ':3003', C['blue_bg'], C['blue']),
        (10.3, 7.5, 'decp-jobs', ':3004', C['blue_bg'], C['blue']),
        (12.8, 7.5, 'decp-events', ':3005', C['blue_bg'], C['blue']),
        # row3
        (7.8, 6.0, 'decp-messaging', ':3006', C['amber_bg'], C['amber']),
        (10.3, 6.0, 'decp-notification', ':3007', C['amber_bg'], C['amber']),
        (12.8, 6.0, 'decp-analytics', ':3008', C['amber_bg'], C['amber']),
        # row4
        (7.8, 4.5, 'decp-research', ':3009', C['blue_bg'], C['blue']),
        (10.3, 4.5, 'decp-realtime', ':3010 public', C['purple_bg'], C['purple']),
        (12.8, 4.5, 'decp-pubsub', ':8085', C['amber_bg'], C['amber_l']),
        # row5
        (10.3, 3.0, 'decp-mongodb', ':27017 (internal)', C['grey_bg'], C['grey']),
    ]
    for x, y, name, port, bg, col in containers:
        box(ax, x, y, 2.3, 0.75, name, port, bg, col, fontsize=8)

    # ── Public ports annotation
    ax.text(7.8, 10.15, '▶ Public: :8082 (HTTP API)',
            ha='center', fontsize=8, color=C['teal'], fontweight='bold')
    ax.text(10.3, 10.15, '▶ Public: :3010 (WebSocket)',
            ha='center', fontsize=8, color=C['purple'], fontweight='bold')

    # Gateway arrows to services
    for x, y, *_ in containers[1:]:
        if x <= 13.2 and y >= 4.3:
            ax.annotate('', xy=(x, y + 0.38), xytext=(7.8 + (x-7.8)*0.15, 8.63),
                        arrowprops=dict(arrowstyle='->', color=C['teal_l'], lw=0.6,
                                        connectionstyle='arc3,rad=0', alpha=0.5), zorder=2)

    # Vercel web
    box(ax, 16.45, 8.5, 1.8, 0.8, 'Next.js 14', 'Web App\nvercel.app', C['green_bg'], C['green'], fontsize=8)
    box(ax, 16.45, 7.3, 1.8, 0.8, 'Auto Deploy', 'GitHub push\n→ build', C['green_bg'], C['green'], fontsize=8)
    arrow(ax, 16.45, 7.7, 16.45, 8.1, C['green'], 1.0)

    # Vercel → Gateway
    arrow(ax, 15.55, 8.5, 14.0, 9.2, C['teal'], 1.0, label='API calls\n:8082', dashed=True)

    # R2
    box(ax, 16.45, 3.8, 1.8, 0.8, 'R2 Bucket', 'decp-media\nCDN', C['amber_bg'], C['amber'], fontsize=8)
    box(ax, 16.45, 2.5, 1.8, 0.8, 'Presigned\nURLs', '5-min TTL\nDirect upload', C['amber_bg'], C['amber'], fontsize=8)
    arrow(ax, 12.8, 6.0, 15.4, 4.0, C['amber_l'], 0.8, dashed=True, label='PUT media')

    # Docker compose label
    ax.text(10.3, 1.65, 'All services managed by  docker compose up -d  (docker-compose.yml)',
            ha='center', fontsize=7.5, color=C['grey'], style='italic')

    # ── Users/devices
    box(ax, 2.7, 1.4, 3.5, 0.8, 'End Users', 'Browser  ·  iOS  ·  Android',
        C['green_bg'], C['green'], fontsize=9)
    arrow(ax, 4.45, 1.4, 15.55, 7.5, C['green'], 1.2, label='HTTPS', dashed=True)
    arrow(ax, 4.45, 1.4, 7.8, 4.0, C['teal'], 1.2, label=':8082/:3010')

    return save(fig, 'diagram_deployment.png')


# ══════════════════════════════════════════════════════════════════════════════
# Generate all diagrams
# ══════════════════════════════════════════════════════════════════════════════
print('Generating diagrams...')
img_soa        = diagram_soa()
img_enterprise = diagram_enterprise()
img_product    = diagram_product()
img_deployment = diagram_deployment()
print()

# ══════════════════════════════════════════════════════════════════════════════
# BUILD WORD DOCUMENT
# ══════════════════════════════════════════════════════════════════════════════
from docx import Document
from docx.shared import Pt, Cm, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import copy

doc = Document()

# ─── Page margins ─────────────────────────────────────────────────────────────
for section in doc.sections:
    section.top_margin    = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin   = Cm(2.5)
    section.right_margin  = Cm(2.5)

# ─── Helper: apply style ──────────────────────────────────────────────────────
TEAL = RGBColor(0x0D, 0x73, 0x77)
DARK = RGBColor(0x21, 0x21, 0x21)
GREY = RGBColor(0x45, 0x5A, 0x64)

def set_run_fmt(run, size=11, bold=False, italic=False, color=None):
    run.font.size = Pt(size)
    run.bold      = bold
    run.italic    = italic
    if color:
        run.font.color.rgb = color

def heading(level, text, color=None):
    p = doc.add_heading(text, level=level)
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    for run in p.runs:
        if color:
            run.font.color.rgb = color
        if level == 1:
            run.font.size = Pt(18)
            run.bold = True
        elif level == 2:
            run.font.size = Pt(14)
            run.bold = True
        elif level == 3:
            run.font.size = Pt(12)
            run.bold = True
    return p

def para(text, size=11, bold=False, italic=False, color=None,
         align=WD_ALIGN_PARAGRAPH.LEFT, space_after=6):
    p = doc.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_after  = Pt(space_after)
    p.paragraph_format.space_before = Pt(0)
    run = p.add_run(text)
    set_run_fmt(run, size, bold, italic, color)
    return p

def bullet(text, level=0, size=11):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_after  = Pt(3)
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.left_indent  = Cm(0.5 + level * 0.5)
    run = p.add_run(text)
    run.font.size = Pt(size)
    return p

def add_image(path, width=Inches(6.5), caption=None):
    doc.add_picture(path, width=width)
    last = doc.paragraphs[-1]
    last.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if caption:
        cp = doc.add_paragraph(caption)
        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cp.paragraph_format.space_before = Pt(2)
        cp.paragraph_format.space_after  = Pt(10)
        for run in cp.runs:
            run.font.size   = Pt(9)
            run.italic      = True
            run.font.color.rgb = GREY

def add_table(headers, rows, col_widths=None):
    t = doc.add_table(rows=1 + len(rows), cols=len(headers))
    t.style = 'Table Grid'
    # header row
    hdr = t.rows[0]
    for i, h in enumerate(headers):
        cell = hdr.cells[i]
        cell.text = h
        cell.paragraphs[0].runs[0].font.bold = True
        cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        cell.paragraphs[0].runs[0].font.size = Pt(10)
        # background colour
        tc_pr = cell._tc.get_or_add_tcPr()
        shd   = OxmlElement('w:shd')
        shd.set(qn('w:val'), 'clear')
        shd.set(qn('w:color'), 'auto')
        shd.set(qn('w:fill'), '0D7377')
        tc_pr.append(shd)
    # data rows
    for ri, row in enumerate(rows):
        tr = t.rows[ri + 1]
        for ci, val in enumerate(row):
            cell = tr.cells[ci]
            cell.text = str(val)
            cell.paragraphs[0].runs[0].font.size = Pt(10)
            if ri % 2 == 0:
                tc_pr = cell._tc.get_or_add_tcPr()
                shd   = OxmlElement('w:shd')
                shd.set(qn('w:val'), 'clear')
                shd.set(qn('w:color'), 'auto')
                shd.set(qn('w:fill'), 'E0F2F1')
                tc_pr.append(shd)
    if col_widths:
        for i, w in enumerate(col_widths):
            for row in t.rows:
                row.cells[i].width = Cm(w)
    doc.add_paragraph()
    return t

def divider():
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after  = Pt(4)
    p_pr = p._p.get_or_add_pPr()
    pb   = OxmlElement('w:pBdr')
    b    = OxmlElement('w:bottom')
    b.set(qn('w:val'), 'single')
    b.set(qn('w:sz'), '6')
    b.set(qn('w:space'), '1')
    b.set(qn('w:color'), '0D7377')
    pb.append(b)
    p_pr.append(pb)

print('Building Word document...')

# ══════════════════════════════════════════════════════════════════════════════
# TITLE PAGE
# ══════════════════════════════════════════════════════════════════════════════
doc.add_paragraph()
doc.add_paragraph()
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('DECP Platform')
r.font.size  = Pt(32)
r.bold       = True
r.font.color.rgb = TEAL

p2 = doc.add_paragraph()
p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
r2 = p2.add_run('Department Engagement & Collaboration Platform')
r2.font.size = Pt(16)
r2.font.color.rgb = GREY

doc.add_paragraph()
p3 = doc.add_paragraph()
p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
r3 = p3.add_run('CO528 Applied Software Architecture — Mini Project Report')
r3.font.size = Pt(13)
r3.bold = True

doc.add_paragraph()
p4 = doc.add_paragraph()
p4.alignment = WD_ALIGN_PARAGRAPH.CENTER
r4 = p4.add_run('University of Peradeniya — Department of Computer Engineering')
r4.font.size = Pt(11)
r4.font.color.rgb = GREY

doc.add_paragraph()
p5 = doc.add_paragraph()
p5.alignment = WD_ALIGN_PARAGRAPH.CENTER
r5 = p5.add_run('March 2026')
r5.font.size = Pt(11)
r5.font.color.rgb = GREY

doc.add_page_break()

# ══════════════════════════════════════════════════════════════════════════════
# TABLE OF CONTENTS (manual)
# ══════════════════════════════════════════════════════════════════════════════
heading(1, 'Table of Contents', TEAL)
toc_items = [
    ('1.', 'Project Overview'),
    ('2.', 'Team Roles & Responsibilities'),
    ('3.', 'Functional Scope'),
    ('4.', 'System Architecture'),
    ('   4.1', 'SOA / Service Interaction'),
    ('   4.2', 'Enterprise Architecture'),
    ('   4.3', 'Product Modularity'),
    ('   4.4', 'Deployment Architecture'),
    ('5.', 'Implementation Details'),
    ('   5.1', 'Backend Microservices'),
    ('   5.2', 'Web Frontend (Next.js 14)'),
    ('   5.3', 'Mobile Application (React Native / Expo)'),
    ('   5.4', 'Inter-Service Communication'),
    ('   5.5', 'Security Implementation'),
    ('6.', 'Research Comparison — Facebook & LinkedIn'),
    ('7.', 'Quality Attribute Justifications'),
    ('8.', 'Cloud Deployment'),
    ('9.', 'Known Limitations & Future Work'),
    ('10.', 'Conclusion'),
]
for num, title in toc_items:
    p = doc.add_paragraph()
    p.paragraph_format.space_after  = Pt(2)
    p.paragraph_format.space_before = Pt(2)
    r = p.add_run(f'{num}    {title}')
    r.font.size = Pt(11)
    if '.' not in num.strip():
        r.bold = True

doc.add_page_break()

# ══════════════════════════════════════════════════════════════════════════════
# 1. PROJECT OVERVIEW
# ══════════════════════════════════════════════════════════════════════════════
heading(1, '1. Project Overview', TEAL)
divider()
para(
    'The DECP (Department Engagement & Collaboration Platform) is a cloud-native, '
    'microservices-based social and professional platform designed specifically for the '
    'University of Peradeniya Department of Computer Engineering. It connects current '
    'students with alumni, department staff, and the wider academic community through '
    'a suite of integrated digital services.', size=11)

para(
    'The platform was developed as the CO528 Applied Software Architecture mini-project, '
    'with a strong emphasis on architectural quality: service decomposition, event-driven '
    'communication, cloud deployment, and support for both web and mobile clients consuming '
    'a common REST API.', size=11)

heading(2, '1.1 Technology Stack')
add_table(
    ['Layer', 'Technology', 'Purpose'],
    [
        ['Backend Services', 'Node.js 20 + Express 4', '10 independent microservices'],
        ['API Gateway',      'Express + http-proxy-middleware', 'JWT validation, CORS, rate limiting'],
        ['Database',         'MongoDB 7 (Docker)', 'Document store for all services'],
        ['Message Bus',      'GCP Pub/Sub Emulator', 'Async event delivery between services'],
        ['Realtime',         'Socket.IO 4',          'WebSocket presence, typing, live feed'],
        ['Media Storage',    'Cloudflare R2',         'Object storage + CDN for images/video'],
        ['Web Frontend',     'Next.js 14 (App Router)', 'SSR/CSR hybrid, deployed on Vercel'],
        ['Mobile App',       'React Native / Expo SDK 54', 'iOS + Android from a single codebase'],
        ['State Management', 'Zustand (web) / Zustand + AsyncStorage (mobile)', 'Auth token persistence'],
        ['CI/CD',            'GitHub Actions',        'Auto-deploy to EC2 on push to main'],
        ['Cloud',            'AWS EC2 t3.medium',     'Ubuntu 22.04, Docker Compose cluster'],
    ],
    [4.5, 5.0, 5.0]
)

heading(2, '1.2 Key Architectural Decisions')
bullets = [
    'Service-Oriented Architecture (SOA): 10 independently deployable services with a single API Gateway entry point.',
    'Event-Driven Architecture (EDA): All cross-service side effects (notifications, analytics) are triggered by Pub/Sub events — services are fully decoupled.',
    'Presigned URL media upload: Files are uploaded directly from the client browser/app to Cloudflare R2, bypassing all backend servers, eliminating bandwidth cost and upload latency.',
    'Stateless JWT authentication: Access tokens (15 min) with refresh token rotation (7 days). No server-side sessions.',
    'Monorepo structure: All services, gateway, web, and mobile in one repository for consistent tooling and shared CI/CD.',
]
for b in bullets:
    bullet(b)

doc.add_page_break()

# ══════════════════════════════════════════════════════════════════════════════
# 2. TEAM ROLES
# ══════════════════════════════════════════════════════════════════════════════
heading(1, '2. Team Roles & Responsibilities', TEAL)
divider()
add_table(
    ['Role', 'Responsibilities', 'Key Deliverables'],
    [
        ['Enterprise Architect',
         'High-level system vision, stakeholder mapping, business workflow definition, departmental domain modelling',
         'Enterprise architecture diagram, role definitions, module interaction model'],
        ['Solution Architect',
         'End-to-end architecture consistency, technology selection, cross-cutting design decisions (JWT, Pub/Sub, R2)',
         'SOA diagram, API contract document, technology justifications'],
        ['Application Architect',
         'Service boundary design, API schema, web and mobile integration patterns, product modularity structure',
         'Product modularity diagram, API_CONTRACT.md, client integration layer'],
        ['Security Architect',
         'Authentication and authorisation model, RBAC design, network isolation, rate limiting, secure upload flow',
         'Security architecture plan, threat mitigation table, bcrypt + JWT implementation'],
        ['DevOps Architect',
         'Docker Compose cluster design, GitHub Actions CI/CD pipeline, EC2 deployment, health checks, scalability planning',
         'Deployment diagram, deploy.yml workflow, CLOUD_DEPLOYMENT.md guide'],
    ],
    [3.5, 6.5, 5.0]
)
doc.add_page_break()

# ══════════════════════════════════════════════════════════════════════════════
# 3. FUNCTIONAL SCOPE
# ══════════════════════════════════════════════════════════════════════════════
heading(1, '3. Functional Scope', TEAL)
divider()
para('All 8 required capability areas from the project brief have been implemented:', size=11)

add_table(
    ['#', 'Capability Area', 'Status', 'Key Features'],
    [
        ['1', 'User Management',         '✅ Complete',
         'Register, Login, JWT auth, Edit profile, Avatar upload (R2), 3 roles: student/alumni/admin, Follow/Unfollow'],
        ['2', 'Feed & Media Posts',      '✅ Complete',
         'Text + image/video posts, Like, Comment, Edit, Delete, Cursor pagination, R2 presigned upload'],
        ['3', 'Jobs & Internships',      '✅ Complete',
         'Post opportunities (alumni/admin), Apply (CV URL), Accept/Reject applications, Text search, Type filter'],
        ['4', 'Events & Announcements',  '✅ Complete',
         'Create events (admin), RSVP, Cancel RSVP, View attendees, Pub/Sub notification on creation'],
        ['5', 'Research Collaboration',  '✅ Complete',
         'Create projects, Join/Leave, Update status (open/in_progress/completed), List by domain/tags'],
        ['6', 'Messaging',               '✅ Complete',
         'Direct 1:1 chat, Read receipts, Typing indicators, Online presence, Message delete, Unread count'],
        ['7', 'Notifications',           '✅ Complete',
         'Event-driven in-app notifications (Pub/Sub), Mark read, Mark-all-read, Unread count badge, Socket push'],
        ['8', 'Analytics Dashboard',     '✅ Complete',
         'Pub/Sub-driven analytics service, admin-only endpoint, active users / post / job metrics'],
    ],
    [0.5, 3.5, 2.0, 9.0]
)

doc.add_page_break()

# ══════════════════════════════════════════════════════════════════════════════
# 4. ARCHITECTURE DIAGRAMS
# ══════════════════════════════════════════════════════════════════════════════
heading(1, '4. System Architecture', TEAL)
divider()

# 4.1 SOA
heading(2, '4.1 SOA / Service Interaction Diagram')
para(
    'The diagram below illustrates all microservices, their communication patterns, '
    'and the data flows through the system. Synchronous communication uses HTTP REST '
    'through the API Gateway. Asynchronous communication uses GCP Pub/Sub push '
    'subscriptions (event bus pattern) for decoupled side-effects such as '
    'notifications and analytics.', size=11)
doc.add_paragraph()
add_image(img_soa, width=Inches(6.8),
          caption='Figure 1 — SOA Service Interaction Diagram')

para(
    'Communication patterns:', size=11, bold=True)
bullet('Synchronous (solid arrows): All client-initiated operations go through the API Gateway on port 8082. '
       'The gateway validates JWT tokens, enforces CORS, applies rate limiting, and proxies requests to the target service.')
bullet('Asynchronous (dashed arrows): Services that create domain events (feed-service, jobs-service, events-service, auth-service) '
       'publish to Pub/Sub topics. The notification-service and analytics-service subscribe via push endpoints.')
bullet('WebSocket (Socket.IO): Clients maintain a persistent WebSocket connection to realtime-service (:3010). '
       'Backend services send realtime events by calling POST /emit on the realtime service over the internal Docker network.')
bullet('Intra-service calls: Services use a shared lib/internalClient.js (Axios with x-internal-token header) to call '
       'each other for data enrichment without going through the gateway.')

doc.add_page_break()

# 4.2 Enterprise
heading(2, '4.2 Enterprise Architecture Diagram')
para(
    'The enterprise diagram shows the platform from a business perspective: the three '
    'user roles and their access patterns, the functional domain modules they interact '
    'with, the cross-cutting infrastructure layer, and the external cloud services '
    'that support the platform.', size=11)
doc.add_paragraph()
add_image(img_enterprise, width=Inches(6.8),
          caption='Figure 2 — Enterprise Architecture Diagram')

para('User roles and their primary workflows:', size=11, bold=True)
add_table(
    ['Role', 'Primary Activities', 'Restricted Capabilities'],
    [
        ['Student',       'Browse feed, apply for jobs, RSVP events, join research projects, direct message, receive notifications', 'Cannot post jobs or create events'],
        ['Alumni',        'Post jobs, contribute to feed, join research projects, mentor students, network via follow system', 'Cannot create department events'],
        ['Admin / Staff', 'All student + alumni capabilities plus: create events, view analytics dashboard, manage users', 'Full administrative access'],
    ],
    [3, 8, 5]
)

doc.add_page_break()

# 4.3 Product
heading(2, '4.3 Product Modularity Diagram')
para(
    'This diagram categorises platform features into Core (must-have) vs Optional (enhanced) '
    'capabilities, and shows the shared infrastructure libraries and client integration '
    'layer that enable code reuse across all services and both client platforms.', size=11)
doc.add_paragraph()
add_image(img_product, width=Inches(6.8),
          caption='Figure 3 — Product Modularity Diagram')

para('Shared library pattern:', size=11, bold=True)
para('Three shared libraries eliminate code duplication across all 10 microservices:', size=11)
bullet('lib/internalClient.js — Axios instance pre-configured with x-internal-token header. '
       'Used by any service that needs to call another service directly.')
bullet('lib/pubsub.js — GCP Pub/Sub client wrapper. Provides a single publishEvent(topic, data) '
       'function used by all event-producing services.')
bullet('lib/r2.js — Cloudflare R2 S3-compatible client. Provides generateUploadUrl(key, mimeType) '
       'and validateObjectExists(key). Used by feed-service and user-service.')

doc.add_page_break()

# 4.4 Deployment
heading(2, '4.4 Deployment Architecture Diagram')
para(
    'The deployment diagram shows the full production infrastructure: an AWS EC2 t3.medium '
    'instance running the entire backend cluster as Docker containers via docker-compose, '
    'a Vercel-hosted Next.js web frontend, and Cloudflare R2 for media storage. '
    'GitHub Actions automates the full deployment on every push to main.', size=11)
doc.add_paragraph()
add_image(img_deployment, width=Inches(6.8),
          caption='Figure 4 — Deployment Architecture Diagram')

para('Deployment decision rationale:', size=11, bold=True)
add_table(
    ['Component', 'Decision', 'Rationale'],
    [
        ['Backend', 'AWS EC2 t3.medium (4 GB RAM, 2 vCPU)',
         'Single-instance Docker Compose keeps complexity low for a prototype. '
         'All 13 containers fit within the 4 GB budget (~1.86 GB used, ~2.1 GB headroom). '
         'Free under AWS Educate/student credits for 12 months.'],
        ['MongoDB', 'Docker container on EC2',
         'Avoids external Atlas dependency. Data stays within the same Docker network '
         'eliminating network latency and simplifying connection strings. '
         'Persistent data volume ensures data survives container restarts.'],
        ['Web Frontend', 'Vercel (free Hobby plan)',
         'Zero-config Next.js deployment. Automatic preview deployments on every PR. '
         'Global CDN with near-zero cold starts. No server to maintain.'],
        ['Media Storage', 'Cloudflare R2',
         'S3-compatible API, zero egress fees (vs AWS S3), and a global CDN. '
         'Presigned PUT uploads bypass the backend server entirely, '
         'eliminating bandwidth costs and improving upload performance.'],
        ['CI/CD', 'GitHub Actions + SSH deploy',
         'On every push to main, the workflow SSHs into EC2, pulls latest code, '
         'rebuilds changed containers, and runs health checks — fully automated.'],
    ],
    [3, 3, 10]
)

doc.add_page_break()

# ══════════════════════════════════════════════════════════════════════════════
# 5. IMPLEMENTATION DETAILS
# ══════════════════════════════════════════════════════════════════════════════
heading(1, '5. Implementation Details', TEAL)
divider()

heading(2, '5.1 Backend Microservices')
para(
    'The backend consists of 10 microservices plus an API Gateway, each running '
    'in its own Docker container. All services follow an identical internal structure:', size=11)
bullet('src/routes/ — Express route definitions with RBAC middleware applied per-route')
bullet('src/controllers/ — Business logic, database access, Pub/Sub publishing, realtime emit calls')
bullet('src/models/ — Mongoose schemas with indexes on all queried fields')
bullet('src/middleware/ — Service-local middleware (e.g., file type validation)')
bullet('lib/ — Shared clients (internalClient, pubsub, r2) symlinked or copied at build time')

doc.add_paragraph()
add_table(
    ['Service', 'Port', 'Key Endpoints & Features'],
    [
        ['Auth',         ':3001',
         'POST /register, POST /login, POST /refresh, POST /logout. '
         'Bcrypt password hashing, JWT access + refresh tokens with rotation. '
         'Publishes decp.user.registered on successful registration.'],
        ['User',         ':3002',
         'Profile CRUD, avatar upload (R2 2-step), user search (?q=), '
         'follow/unfollow, followers/following lists. Injects x-user-id on all requests.'],
        ['Feed',         ':3003',
         'Posts CRUD, likes, comments, cursor pagination, R2 media upload URLs, '
         'author filter. Publishes decp.post.created. Broadcasts feed:new_post via realtime.'],
        ['Jobs',         ':3004',
         'Job postings (alumni/admin), applications (students), accept/reject status, '
         'text search, type filter. Publishes decp.job.posted and decp.job.applied.'],
        ['Events',       ':3005',
         'Department events (admin-only create), RSVP / cancel-RSVP, '
         'attendee list. Publishes decp.event.created and decp.event.rsvp.'],
        ['Messaging',    ':3006',
         '1:1 direct messages, inbox with per-conversation unread count, '
         'mark-read (emits message:read socket event), message delete, unread-count endpoint.'],
        ['Notification', ':3007',
         'In-app notifications delivered via Pub/Sub push subscriptions. '
         'Stores notification documents, marks read, mark-all-read, unread count. '
         'Emits notification socket event for realtime badge updates.'],
        ['Analytics',    ':3008',
         'Pub/Sub push subscriber for all domain events. '
         'Tracks active users, post counts, job application metrics. '
         'Admin-only overview endpoint.'],
        ['Research',     ':3009',
         'Research project CRUD, join/leave collaborator, status updates '
         '(open → in_progress → completed), tag-based filtering.'],
        ['Realtime',     ':3010',
         'Socket.IO server. User presence (online/offline broadcast), '
         'typing relay (typing:start/stop), feed broadcast (feed:new_post), '
         'notification push. POST /emit endpoint called by other services.'],
    ],
    [2.2, 1.5, 11.8]
)

heading(2, '5.2 Web Frontend (Next.js 14)')
para(
    'The web application is built with Next.js 14 App Router, TypeScript, Tailwind CSS, '
    'and Zustand for state management. All 14 routes/pages are fully implemented and '
    'connected to the live backend API.', size=11)

add_table(
    ['Page / Component', 'Features Implemented'],
    [
        ['Feed (/feed)',
         'Post creation with R2 multi-file media upload (progress indicator), '
         'inline comments, like toggle, edit/delete own posts, cursor pagination with '
         '"New posts available" pill, real-time new post injection via Socket.IO'],
        ['Jobs (/jobs)',
         'Job listing with type filter chips and text search, Apply modal (CV URL + cover letter), '
         'Post Job modal (alumni/admin), Manage Applications drawer with accept/reject'],
        ['Events (/events)',
         'Event grid, RSVP / Cancel-RSVP toggle, Event Detail modal with attendee count, '
         'Create Event form (admin only)'],
        ['Research (/research)',
         'Project cards with join/leave, Create Project modal, Project Detail bottom-sheet '
         'with status update controls (creator only)'],
        ['Messages (/messages)',
         'Full chat UI: conversation inbox with unread badges, typing indicators (animated dots), '
         'double-tick read receipts, online presence dot, user-search modal to start new '
         'conversation, message delete, auto-resize textarea'],
        ['Notifications (/notifications)',
         'Notification feed, click-to-navigate via notification.link, '
         'Mark-all-read, cursor pagination, realtime badge in nav bar'],
        ['Profile (/profile)',
         'Editable name/bio, R2 avatar upload with optimistic preview, '
         'follower/following count with expandable panel'],
        ['Profile /profile/[id]',
         'Other-user profile: follow/unfollow button, their posts feed, message button'],
        ['Admin (/admin)',
         'RBAC guard (non-admin redirected to /feed), analytics overview'],
        ['Auth (/login, /register)',
         'Form validation, error display, token storage, socket connect on login'],
    ],
    [4, 11]
)

heading(2, '5.3 Mobile Application (React Native / Expo SDK 54)')
para(
    'The mobile application is built with React Native and Expo Router v4 (file-based routing), '
    'providing a native experience on both iOS and Android. All 8 tab screens are fully implemented '
    'and consume the same REST API and WebSocket connection as the web client.', size=11)

add_table(
    ['Screen', 'Key Features'],
    [
        ['Feed',          'Infinite scroll (FlatList), pull-to-refresh, like, comment, media display'],
        ['Jobs',          'Job cards, apply modal, post job (alumni), type filter, application management'],
        ['Events',        'Event list, RSVP toggle, create event (admin), event detail modal'],
        ['Research',      'Project list, join/leave, create project modal, detail bottom-sheet, status update'],
        ['Messages',      'Conversation inbox, full chat screen, typing indicators, read receipts, online presence badge'],
        ['Notifications', 'Notification list, mark-all-read, navigation on tap'],
        ['Profile',       'Edit profile, avatar upload (R2), follower/following counts'],
        ['Auth',          'Login/Register forms with validation, JWT token storage in AsyncStorage'],
    ],
    [3, 12]
)

para('Notable implementation details:', size=11, bold=True)
bullet('SafeAreaView edges={[\'top\',\'left\',\'right\']} on all tab screens — excludes bottom edge '
       'to prevent double-stacking with the tab bar (resolved a gray-bar crop bug on all screens).')
bullet('Socket.IO presence system uses a shared onlineUsers Set in socket.ts updated by both '
       'HTTP polling (fetchUserPresence) and socket events — ensures one-way online/offline '
       'display bug is prevented regardless of event ordering.')
bullet('Token refresh interceptor with request queue — concurrent requests wait for a single '
       'refresh call rather than each triggering their own refresh (prevents race conditions).')

heading(2, '5.4 Inter-Service Communication')
para('Two communication patterns are used, each chosen deliberately:', size=11, bold=True)

para('Synchronous REST (HTTP):', size=11, bold=True)
para('Used for client-initiated, request-response operations where the caller '
     'needs an immediate response. All client requests go through the API Gateway which '
     'validates the JWT, injects x-user-id and x-user-role headers, then proxies to the '
     'target service. Internal service-to-service calls use lib/internalClient.js with the '
     'x-internal-token header to bypass JWT validation.', size=11)

para('Asynchronous Pub/Sub (Event Bus):', size=11, bold=True)
para('Used for domain events where the publishing service should not be coupled to its '
     'consumers. When a user registers, a post is created, or a job is applied for, '
     'the producing service publishes to a topic and immediately returns to the client. '
     'The notification-service and analytics-service receive push deliveries from the emulator. '
     'This means adding a new event consumer (e.g., an email service) requires zero changes '
     'to the producing service.', size=11)

add_table(
    ['Topic', 'Publisher', 'Subscribers', 'Trigger'],
    [
        ['decp.user.registered',   'auth-service',        'notification, analytics', 'New account created'],
        ['decp.post.created',      'feed-service',        'notification, analytics', 'New post published'],
        ['decp.job.posted',        'jobs-service',        'notification, analytics', 'New job listed'],
        ['decp.job.applied',       'jobs-service',        'notification, analytics', 'Student applies'],
        ['decp.event.created',     'events-service',      'notification, analytics', 'New event posted'],
        ['decp.event.rsvp',        'events-service',      'notification, analytics', 'User RSVPs'],
    ],
    [4, 3, 3.5, 5]
)

heading(2, '5.5 Security Implementation')
para('A defence-in-depth approach with seven independent security layers:', size=11)
add_table(
    ['Layer', 'Implementation', 'Protection Against'],
    [
        ['Transport',      'HTTPS (TLS) on all external endpoints via EC2 + Vercel',
         'Man-in-the-middle attacks, eavesdropping'],
        ['Authentication', 'JWT HS256, 15-min access token, 7-day refresh with rotation stored in MongoDB',
         'Token theft — stolen token expires in 15 min; rotation prevents reuse'],
        ['Authorisation',  'RBAC checked at service level using x-user-role header injected by gateway',
         'Privilege escalation; students cannot post jobs or create events'],
        ['Passwords',      'Bcrypt with 12 salt rounds (~250ms per hash)',
         'Brute-force and rainbow table attacks on leaked hashes'],
        ['Network',        'Internal services not exposed to host network; x-internal-token on service calls',
         'Direct service bypass; external callers pretending to be internal services'],
        ['Rate Limiting',  '200 req/15min global, 10 req/15min on /auth/login and /auth/register',
         'Brute-force login attempts, spam registration, DDoS amplification'],
        ['File Upload',    'MIME whitelist (jpeg/png/webp/mp4/pdf), presigned R2 URLs, 5-min TTL',
         'Malware upload, storage abuse, server-side upload SSRF'],
    ],
    [3, 6, 6]
)

doc.add_page_break()

# ══════════════════════════════════════════════════════════════════════════════
# 6. RESEARCH COMPARISON
# ══════════════════════════════════════════════════════════════════════════════
heading(1, '6. Research Comparison — Facebook & LinkedIn', TEAL)
divider()
para(
    'This section analyses the architectures and design patterns used by the two most '
    'prominent social-professional platforms (Facebook and LinkedIn), identifies what is '
    'missing from those platforms for a university department context, and explains how '
    'this research influenced the design choices made in DECP.', size=11)

heading(2, '6.1 Facebook Architecture Analysis')
para(
    'Facebook is one of the largest distributed systems ever built, serving over 3 billion '
    'active users. Key architectural patterns relevant to a social platform include:', size=11)

add_table(
    ['Pattern / Decision', 'Facebook\'s Approach', 'Scale It Addresses'],
    [
        ['News Feed Ranking',
         'EdgeRank algorithm (now AI-driven ML ranking). The feed is not chronological — '
         'posts are ranked by relationship strength, recency, content type, and engagement signals. '
         'Pre-computed per-user feed slices are stored in TAO (a distributed graph cache).',
         'Serving 2B+ personalised feeds without real-time DB scans'],
        ['Graph Database (TAO)',
         'Custom two-level cache (memcache + MySQL) built on a graph model. '
         'Social connections (friends, likes, group membership) are edges in the graph. '
         'TAO provides O(1) lookups for social connections.',
         'Social graph traversal (mutual friends, shared groups) at scale'],
        ['Media Delivery (Haystack)',
         'Custom blob storage system. Photos are stored in large "haystacks" (single files '
         'containing millions of images) with a metadata index. CDN layer (Facebook Points of Presence) '
         'distributes content globally.',
         'Storing and serving 350M+ photos/day with sub-100ms latency'],
        ['Realtime Messaging (Iris)',
         'Custom publish-subscribe system for chat. Messages route through a sharded '
         'presence service. Iris uses consistent hashing to route messages to the correct shard.',
         'Supporting 1B+ daily messaging users with ≤100ms delivery'],
        ['Microservices at Scale',
         'Service Mesh (Thrift RPC over internal network). Thousands of services '
         'communicate via a custom RPC framework. Service discovery via ZooKeeper.',
         'Independent scaling and deployment of thousands of services'],
    ],
    [4, 7.5, 4]
)

heading(2, '6.2 LinkedIn Architecture Analysis')
para(
    'LinkedIn\'s architecture is particularly relevant to DECP because of the similar '
    'professional-social context (connecting professionals, job listings, content sharing):', size=11)

add_table(
    ['Pattern / Decision', 'LinkedIn\'s Approach', 'Scale It Addresses'],
    [
        ['Economic Graph',
         'LinkedIn models the professional world as a graph: members, companies, jobs, skills, '
         'and schools are nodes; connections, applications, and endorsements are edges. '
         'The "Economic Graph" is the foundation for all recommendations (Jobs You May Like, '
         'People You May Know).',
         'Relevant job and connection recommendations for 900M+ users'],
        ['Feed Architecture (Galene)',
         'Galene is LinkedIn\'s feed ranking engine. Unlike Facebook\'s algorithmic feed, '
         'LinkedIn uses a hybrid: a follower graph "fan-out" model combined with an ML '
         'relevance score. Professional content (job changes, work articles) is weighted differently '
         'than casual social content.',
         'Professional-context ranking for diverse content types'],
        ['Job Matching Engine',
         'ML-based matching between job descriptions and member profiles. '
         'Skills extraction using NLP on resumes and job descriptions. '
         'Real-time personalisation with A/B testing infrastructure.',
         'Serving personalised job recommendations at billion-query scale'],
        ['Kafka Event Streaming',
         'LinkedIn invented Apache Kafka for internal event streaming. '
         'All activity (profile views, job applications, messages) flows through Kafka topics '
         'consumed by analytics, recommendations, and notification services.',
         'Decoupled, durable event delivery for 7+ trillion messages/day'],
        ['Messaging (Voldemort)',
         'LinkedIn built Voldemort (a distributed key-value store) for high-throughput '
         'message storage. Inbox delivery uses push-pull hybrid: realtime WebSocket push '
         'for online users, email/push notification for offline users.',
         'Messaging 900M professionals with guaranteed delivery'],
    ],
    [4, 7.5, 4]
)

heading(2, '6.3 What Is Missing From Facebook & LinkedIn for a University Department Context')
para(
    'While both platforms are highly capable, they are designed for general consumer and '
    'professional audiences. Neither addresses the specific needs of a closed academic '
    'department community. The following gaps were identified:', size=11)

add_table(
    ['Gap Area', 'What Facebook / LinkedIn Lack', 'DECP\'s Response'],
    [
        ['Academic Role Hierarchy',
         'Both platforms have flat permission models (user, page admin, group admin). '
         'Neither supports academic roles: student, alumni, and department staff with '
         'different content creation rights (e.g., only alumni can post jobs, only admin creates events).',
         'DECP implements RBAC with three roles enforced at service level. '
         'Role is injected by the gateway from the verified JWT, '
         'so every service independently enforces role-based access.'],
        ['Research Collaboration',
         'Facebook has Groups; LinkedIn has Projects. Neither provides a structured '
         'research collaboration workflow with project status tracking '
         '(open → in progress → completed), collaborator invitation, and domain tagging.',
         'DECP\'s Research service is specifically designed for academic project '
         'collaboration with status lifecycle management and tag-based discovery.'],
        ['Department-Scoped Events',
         'Facebook Events are public or friend-scoped. LinkedIn Events are company-page-scoped. '
         'Neither provides a department-scoped event system where only authorised staff '
         'can create official announcements visible to all department members.',
         'DECP Events restrict creation to admin role while making events visible to all '
         'members. RSVP tracking is tied to the department user registry.'],
        ['Closed Community Privacy',
         'Both platforms are public-facing with complex privacy settings. '
         'A department platform requires a closed community where all users are '
         'verified members — not open to the general public.',
         'DECP requires registration (email + password). All API endpoints require JWT. '
         'There is no public-facing content. All interactions are within the closed community.'],
        ['Direct Alumni-Student Connection',
         'LinkedIn connects professionals but does not have a dedicated "alumni mentoring '
         'a current student" workflow. The relationship between a graduate and a current '
         'student in the same department is not a first-class concept.',
         'DECP\'s alumni role is specifically designed to post job opportunities '
         'and collaborate with students. The follow system enables students to follow '
         'alumni for professional updates and mentorship.'],
        ['Integrated Job + Event + Feed Pipeline',
         'On LinkedIn, jobs, events, and feed are separate isolated sections with no '
         'cross-feature notifications. On Facebook, professional events and job postings '
         'are weak secondary features.',
         'DECP uses Pub/Sub to generate cross-feature notifications: posting a job '
         'notifies all students, creating an event notifies all members, a research project '
         'joining is recorded in analytics — all through a single event bus.'],
    ],
    [3.5, 6, 6]
)

heading(2, '6.4 How This Research Influenced DECP\'s Design')
para('The analysis of Facebook and LinkedIn directly shaped the following DECP architectural decisions:', size=11)
bullet('Event-driven architecture (inspired by LinkedIn Kafka): DECP uses a Pub/Sub event bus '
       'to decouple the notification and analytics services from domain services, '
       'exactly as LinkedIn uses Kafka to decouple recommendations from domain activity.')
bullet('Role-Based Access Control (gap identified in both platforms): The three-tier RBAC '
       '(student / alumni / admin) was designed specifically to fill the academic role hierarchy '
       'gap missing from both Facebook and LinkedIn.')
bullet('Research Collaboration module: Directly responds to the absence of academic project '
       'workflows in both platforms. The status lifecycle (open → in_progress → completed) '
       'mirrors academic research stages.')
bullet('Closed community model: Unlike both Facebook and LinkedIn which are open-register platforms, '
       'DECP requires all users to be verified by a department administrator (or self-register '
       'with a valid university email format). All content is private to members.')
bullet('Integrated notification pipeline (inspired by LinkedIn\'s push-pull model): DECP uses '
       'Socket.IO push for online users (immediate badge update) and in-app notification '
       'storage for offline users — the same hybrid delivery model LinkedIn uses.')
bullet('Presigned upload pattern (inspired by Facebook\'s Haystack CDN model): Media files '
       'are uploaded directly to Cloudflare R2 from the client browser, bypassing the backend '
       'server entirely. This mirrors Facebook\'s approach of using a dedicated blob storage '
       'system separate from application servers.')

doc.add_page_break()

# ══════════════════════════════════════════════════════════════════════════════
# 7. QUALITY ATTRIBUTE JUSTIFICATIONS
# ══════════════════════════════════════════════════════════════════════════════
heading(1, '7. Quality Attribute Justifications', TEAL)
divider()
para(
    'For each quality attribute, the following documents: the design decision made, '
    'why it supports the attribute, and the tradeoff introduced.', size=11)

qa_items = [
    ('7.1 Scalability',
     'Independent horizontal scaling via SOA + stateless services.',
     [
         ('Design Decision',
          'All 10 microservices are independently deployable and stateless (no in-memory session state). '
          'Each service scales horizontally without affecting others. The API Gateway is the only single '
          'entry point. On AWS EC2, Docker Compose can be upgraded to ECS/Kubernetes for auto-scaling.'),
         ('Why It Supports Scalability',
          'SOA enables partial scaling: if feed requests spike, only feed-service instances are scaled — '
          'the analytics and research services remain unchanged. Stateless design means any instance '
          'can handle any request, enabling round-robin load balancing with no sticky sessions. '
          'This pattern is directly inspired by how LinkedIn independently scales its Feed, Messaging, '
          'and Jobs services.'),
         ('Tradeoff',
          'The current Docker Compose deployment is single-instance (no horizontal scaling). '
          'Scaling to multiple instances requires a Redis-backed shared state layer for Socket.IO '
          '(presence data) and MongoDB replica set for read scaling. '
          'The architecture is designed to support this upgrade path without service code changes.'),
     ]),
    ('7.2 Security',
     'Multi-layer defence: JWT, RBAC, network isolation, bcrypt, rate limiting, presigned uploads.',
     [
         ('Design Decision',
          'Short-lived JWT access tokens (15 min) with refresh token rotation. RBAC enforced at '
          'service level using role injected by the gateway. Internal services are not reachable '
          'from outside the Docker network. Rate limiting at gateway (10/15min on auth). '
          'bcrypt with 12 rounds for passwords. Presigned R2 URLs with 5-min TTL for file uploads.'),
         ('Why It Supports Security',
          'Multiple independent layers mean compromising one does not compromise the system. '
          'Stolen access token → expires in 15 minutes. Brute-force login → rate limited to 10 '
          'attempts per 15 minutes. Compromised service → cannot reach other internal services '
          'without x-internal-token. Leaked password hash → bcrypt is computationally expensive '
          'to crack (~250ms/hash intentionally).'),
         ('Tradeoff',
          '15-minute access tokens require periodic refresh calls (minor network overhead). '
          'Bcrypt adds ~250ms to every login — noticeable on slow devices but acceptable given '
          'the security guarantee. The shared JWT secret (HS256) is simpler than RS256 but means '
          'all services share the signing key; RS256 with public/private keys would be the '
          'production-grade upgrade.'),
     ]),
    ('7.3 Availability',
     'SOA fault isolation + Pub/Sub durable message queuing.',
     [
         ('Design Decision',
          'Services are independently deployed — a failing service does not crash others. '
          'Health check endpoints (GET /health) on every service. The API Gateway returns HTTP 502 '
          'on downstream failure rather than an unhandled exception. Pub/Sub retains undelivered '
          'messages for 7 days, ensuring notifications are not lost if the notification-service '
          'is temporarily unavailable.'),
         ('Why It Supports Availability',
          'Users can browse the feed and apply for jobs even if the analytics service is down. '
          'Pub/Sub\'s durable delivery means domain events are not dropped during maintenance windows. '
          'The Docker restart: unless-stopped policy on all containers means services automatically '
          'restart after a crash without manual intervention.'),
         ('Tradeoff',
          'Single EC2 instance is a single point of failure at the infrastructure level. '
          'A second EC2 instance with a load balancer would improve infrastructure-level availability. '
          'MongoDB runs as a single container with no replica set — data loss risk on catastrophic failure. '
          'Production grade would use a MongoDB replica set or Atlas M10+ tier.'),
     ]),
    ('7.4 Maintainability',
     'Consistent SOA structure + monorepo + standard response envelope + API versioning.',
     [
         ('Design Decision',
          'Every service follows an identical internal structure (routes/controllers/models/middleware). '
          'All API responses use the same envelope: { success: true/false, data/error: ... }. '
          'API prefix is /api/v1/ enabling future v2 introduction without breaking existing clients. '
          'Monorepo with GitHub Actions CI/CD ensures consistent tooling across all services.'),
         ('Why It Supports Maintainability',
          'A developer who understands one service (e.g., jobs-service) can immediately navigate '
          'any other service. The Single Responsibility Principle at service level means each service '
          'has a clear, bounded domain. Adding a new feature follows a predictable pattern: '
          'model → controller → route → optional Pub/Sub event. '
          'The versioned API allows mobile clients on older app versions to continue working '
          'while v2 endpoints are introduced.'),
         ('Tradeoff',
          '10 services incur more operational overhead than a monolith for a 4-person team. '
          'Developers must context-switch between services. '
          'Data denormalisation (e.g., authorName stored on posts) avoids cross-service joins '
          'but creates consistency issues when users update their name — acceptable for a prototype, '
          'but a background reconciliation job would be needed in production.'),
     ]),
    ('7.5 Performance',
     'Cursor pagination + CDN media delivery + data denormalisation + MongoDB indexes.',
     [
         ('Design Decision',
          'Feed uses cursor-based pagination (not offset/SKIP): GET /posts?cursor=<last_id>&limit=20 '
          'uses an indexed _id comparison, performing in O(log n) regardless of total post count. '
          'Media (images, video) is served from Cloudflare R2\'s global CDN. '
          'Author name and avatar are denormalised onto post documents, eliminating a cross-service '
          'join on every feed render. All Mongoose queries use indexes on authorId, createdAt, _id.'),
         ('Why It Supports Performance',
          'Cursor pagination is O(log n) vs offset pagination which degrades to O(n) as total records '
          'grow. R2 CDN serves media from the nearest edge node (typically <200ms globally). '
          'Denormalisation means each feed render requires exactly one MongoDB query rather than '
          'one per post for author data. Socket.IO WebSocket connection eliminates polling — '
          'new post/message notifications are pushed in real time (zero client-side polling overhead).'),
         ('Tradeoff',
          'Denormalisation introduces data inconsistency: if a user changes their display name, '
          'old posts show the old name. A background reconciliation job would be needed in production. '
          'No Redis caching layer: hot endpoints (feed, jobs) hit MongoDB on every request. '
          'In production, a Redis cache with post-creation invalidation would reduce DB load by 80%+.'),
     ]),
    ('7.6 Interoperability',
     'Single REST + JSON + JWT API consumed identically by web, mobile, and future clients.',
     [
         ('Design Decision',
          'Both web (Next.js) and mobile (React Native) consume the exact same REST endpoints, '
          'same JSON response format, and same JWT Bearer token authentication. '
          'No client-specific API variants exist. '
          'Cloudflare R2 uses the S3-compatible API (not vendor-locked to AWS). '
          'API prefix /api/v1/ allows future clients to build against a stable contract.'),
         ('Why It Supports Interoperability',
          'Any HTTP client (browser, mobile app, CLI tool, third-party integration) can consume '
          'the DECP API without requiring platform-specific SDK code. '
          'The same JWT in the Authorization: Bearer header works identically in the browser\'s '
          'axios instance and in React Native\'s fetch. '
          'R2\'s S3 compatibility means switching to AWS S3 or any other S3-compatible store '
          '(MinIO, Backblaze B2) requires only an endpoint URL change.'),
         ('Tradeoff',
          'REST over JSON is slightly less efficient than binary gRPC (larger payload, no schema '
          'enforcement at the transport layer). For a prototype serving <10,000 users, '
          'REST is the right trade: universal browser support without additional tooling. '
          'There is no formal OpenAPI specification — the API_CONTRACT.md serves as the contract. '
          'In production, a Swagger/OpenAPI spec would be generated from Zod schemas.'),
     ]),
]

for title, summary, points in qa_items:
    heading(2, title)
    para(f'Summary: {summary}', size=11, italic=True, color=GREY)
    for sub_title, sub_body in points:
        para(sub_title + ':', size=11, bold=True)
        para(sub_body, size=11)
    doc.add_paragraph()

# Summary table
heading(2, '7.7 Quality Attributes Summary')
add_table(
    ['Quality Attribute', 'Key Design Decision', 'Tradeoff'],
    [
        ['Scalability',     'Stateless SOA, independent services',              'Cold starts; single EC2 instance'],
        ['Security',        'JWT + RBAC + bcrypt + rate limiting + R2 presigned', '15-min token refresh overhead'],
        ['Availability',    'SOA fault isolation + Pub/Sub durable queuing',    'Single EC2 SPOF; no MongoDB replica'],
        ['Maintainability', 'Consistent SOA structure + monorepo + versioned API', 'Service proliferation overhead'],
        ['Performance',     'Cursor pagination + CDN + denormalisation + indexes', 'Denormalisation inconsistency'],
        ['Interoperability','Unified REST+JSON+JWT for web, mobile, future',   'REST vs gRPC efficiency; no OpenAPI'],
    ],
    [3.5, 6, 6]
)

doc.add_page_break()

# ══════════════════════════════════════════════════════════════════════════════
# 8. CLOUD DEPLOYMENT
# ══════════════════════════════════════════════════════════════════════════════
heading(1, '8. Cloud Deployment', TEAL)
divider()

heading(2, '8.1 Infrastructure Overview')
add_table(
    ['Component', 'Provider', 'Specification', 'Cost'],
    [
        ['Backend Cluster',  'AWS EC2',         't3.medium (2 vCPU, 4 GB RAM) Ubuntu 22.04',       'Free (AWS Educate 12-month credit)'],
        ['Web Frontend',     'Vercel',           'Hobby plan, Next.js auto-build from GitHub',       'Free (Hobby plan)'],
        ['Media Storage',    'Cloudflare R2',    '10 GB free tier, 1M operations/month free',        'Free up to 10 GB'],
        ['Database',         'Docker on EC2',    'MongoDB 7 container, 512 MB reserved, persistent volume', 'Included in EC2'],
        ['Pub/Sub',          'Docker on EC2',    'GCP Pub/Sub emulator container',                   'Included in EC2'],
        ['CI/CD',            'GitHub Actions',   '2,000 free minutes/month for public repos',        'Free'],
        ['Domain (optional)', 'Any registrar',  'Point A record to EC2 Elastic IP',                 '~$10/year'],
    ],
    [3, 2.5, 5.5, 4]
)

heading(2, '8.2 Memory Budget (t3.medium)')
add_table(
    ['Container', 'Reserved RAM'],
    [
        ['decp-gateway',            '~80 MB'],
        ['decp-auth',               '~80 MB'],
        ['decp-user',               '~80 MB'],
        ['decp-feed',               '~100 MB'],
        ['decp-jobs',               '~80 MB'],
        ['decp-events',             '~80 MB'],
        ['decp-messaging',          '~80 MB'],
        ['decp-notification',       '~80 MB'],
        ['decp-analytics',          '~80 MB'],
        ['decp-research',           '~80 MB'],
        ['decp-realtime',           '~100 MB'],
        ['decp-mongodb',            '~512 MB'],
        ['decp-pubsub (emulator)',  '~400 MB'],
        ['OS + Docker overhead',    '~430 MB'],
        ['TOTAL USED',              '~1,862 MB'],
        ['Available headroom',      '~2,134 MB'],
    ],
    [8, 7]
)

heading(2, '8.3 CI/CD Pipeline (GitHub Actions)')
para('The automated deployment pipeline is defined in .github/workflows/deploy.yml '
     'and runs on every push to the main branch:', size=11)
steps = [
    ('Step 1 — Notify', 'Log deployment start with EC2 hostname and timestamp'),
    ('Step 2 — SSH Connect', 'Connect to EC2 via appleboy/ssh-action using EC2_HOST, EC2_USER, EC2_SSH_KEY secrets'),
    ('Step 3 — Install Docker', 'Install Docker CE if not present (idempotent — skipped on subsequent runs)'),
    ('Step 4 — Clone / Pull', 'Clone repo on first deploy; git reset --hard origin/main on subsequent deploys'),
    ('Step 5 — Write Env File', 'Inject all 11 GitHub Secrets into docker-compose.env (JWT, R2 keys, etc.)'),
    ('Step 6 — Build & Start', 'docker compose up -d --build --remove-orphans (rebuilds only changed services)'),
    ('Step 7 — Pub/Sub Setup', 'Wait 20s for MongoDB + Pub/Sub to start; run scripts/setup-pubsub.js'),
    ('Step 8 — Health Check', 'curl /health on gateway :8082 and realtime :3010; log HTTP status codes'),
]
for name, desc in steps:
    bullet(f'{name}: {desc}')

heading(2, '8.4 Scalability Path')
para('The current deployment is a single-instance prototype. The following upgrades are '
     'available without changing any service code:', size=11)
add_table(
    ['Current (Prototype)', 'Production Upgrade', 'Benefit'],
    [
        ['Docker Compose on single EC2',      'ECS Fargate or Kubernetes (EKS)',          'Independent auto-scaling per service'],
        ['MongoDB single container',          'MongoDB Atlas M10+ with replica set',      'Automated backups, failover, scaling'],
        ['No caching layer',                  'Redis (ElastiCache) for hot feed data',    '80%+ DB load reduction on feed'],
        ['Socket.IO in-memory presence',      'Redis Pub/Sub adapter for Socket.IO',      'Horizontal scaling for realtime'],
        ['Single EC2 instance',               'Application Load Balancer + Auto Scaling', 'Zero-downtime deploys, HA'],
        ['docker-compose.yml',                'docker-compose.prod.yml (already in repo)','Prod-hardened config (no dev ports)'],
    ],
    [4.5, 5, 6]
)

doc.add_page_break()

# ══════════════════════════════════════════════════════════════════════════════
# 9. KNOWN LIMITATIONS
# ══════════════════════════════════════════════════════════════════════════════
heading(1, '9. Known Limitations & Future Work', TEAL)
divider()
add_table(
    ['Limitation', 'Impact', 'Future Resolution'],
    [
        ['FCM Push Notifications',
         'Notification events are stored in the DB and delivered via Socket.IO for online users. '
         'Mobile push notifications to offline devices are logged but not sent (Firebase credentials not configured).',
         'Provide Firebase service account JSON as a GitHub Secret. '
         'The notification-service already has the FCM integration code ready to activate.'],
        ['MongoDB not replicated',
         'Single MongoDB container with a persistent volume. '
         'A catastrophic disk failure would result in data loss.',
         'Migrate to MongoDB Atlas M10+ with automatic backups and multi-region replica sets.'],
        ['Socket.IO in-memory presence',
         'Presence (online/offline) state is stored in a JavaScript Map in the realtime service. '
         'Does not persist across restarts and cannot scale to multiple realtime instances.',
         'Replace with Redis Pub/Sub adapter: io.adapter(createAdapter(pubClient, subClient)).'],
        ['No email verification',
         'Users can register with any email. No verification that the user owns the address.',
         'Add Nodemailer + a verification token flow. Restrict registration to university email domains.'],
        ['Mentorship Matching',
         'There is no algorithmic matching of alumni mentors to students based on skills or interests.',
         'Implement a basic matching algorithm using shared tags/domain between alumni profiles and student interests.'],
        ['Video upload size',
         'Large video files (>100 MB) may time out on the presigned URL flow in the current client implementation.',
         'Implement multipart upload for large files using R2\'s S3 multipart API.'],
    ],
    [3.5, 6, 6]
)

doc.add_page_break()

# ══════════════════════════════════════════════════════════════════════════════
# 10. CONCLUSION
# ══════════════════════════════════════════════════════════════════════════════
heading(1, '10. Conclusion', TEAL)
divider()
para(
    'The DECP Platform successfully delivers a cloud-native, architecture-first solution '
    'to the challenge of connecting university department students and alumni. '
    'All 8 required capability areas from the CO528 project brief have been fully implemented '
    'and are running on a live cloud-deployed backend.', size=11)

para(
    'The project demonstrates all four required architecture styles: Service-Oriented Architecture '
    '(10 independent microservices), Event-Driven Architecture (Pub/Sub event bus for '
    'notifications and analytics), Mobile Architecture (React Native consuming the same API '
    'as the web client), and Cloud Architecture (AWS EC2 Docker cluster with GitHub Actions CI/CD).', size=11)

para(
    'The research comparison with Facebook and LinkedIn identified six critical gaps in '
    'general-purpose social platforms when applied to a university department context: '
    'academic role hierarchy, research collaboration workflows, closed community privacy, '
    'department-scoped events, direct alumni-student connection, and an integrated '
    'notification pipeline. Each of these gaps directly shaped a design decision in DECP.', size=11)

para(
    'The six quality attributes (Scalability, Security, Availability, Maintainability, '
    'Performance, and Interoperability) are each addressed by a deliberate architectural '
    'decision with documented tradeoffs. The platform is designed with a clear upgrade path '
    'from its current single-instance prototype to a horizontally scalable, highly available '
    'production system — without requiring changes to any service code.', size=11)

para(
    'The platform is ready for live demonstration at the CO528 presentation. All services '
    'are running, both web and mobile clients are functional, and the automated deployment '
    'pipeline ensures the latest code is always live on the EC2 instance.', size=11)

# ── Save ──────────────────────────────────────────────────────────────────────
OUT_PATH = os.path.join(OUT, 'DECP_Architecture_Report.docx')
doc.save(OUT_PATH)
print(f'\n✅ Report saved to:\n   {OUT_PATH}')
print(f'   Diagrams in: {IMG_DIR}')
