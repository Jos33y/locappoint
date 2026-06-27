// src/hooks/useStatusEffects.js
// All side effects for the status page: reveal observer, scroll progress,
// topbar shadow, relative timestamps, anchor focus, surface bar hydration,
// copy buttons. Ported from the static status.js. Mount-scoped, full cleanup.

import { useEffect } from 'react'

const STAGGER_MS = 55
const STAGGER_CAP_MS = 600
const CHILD_SELECTORS = '.card, .check, .step, .beyond__item, .next-card, .payment, .need, .log__entry, .quicklink, .phase, .city, .surface, .email-row:not(.email-row--head)'


export function useStatusEffects() {
    useEffect(() => {
        document.documentElement.classList.remove('no-js')
        document.documentElement.classList.add('js')

        const cleanups = [
            setupCopyButtons(),
            setupRevealObserver(),
            setupScrollProgress(),
            setupTopbarShadow(),
            setupAnchorFocus(),
        ]
        setupRelativeTimes()
        setupSurfaces()

        return () => cleanups.forEach((fn) => { if (typeof fn === 'function') fn() })
    }, [])
}


/* ============================================================
   Toast
   ============================================================ */

function showToast(message) {
    const toastEl = document.getElementById('toast')
    if (!toastEl) return
    toastEl.textContent = message
    toastEl.classList.add('is-visible')
    if (showToast._timer) clearTimeout(showToast._timer)
    showToast._timer = setTimeout(() => toastEl.classList.remove('is-visible'), 1800)
}


/* ============================================================
   Copy buttons (delegated, so future .js-copy elements work)
   ============================================================ */

function setupCopyButtons() {
    async function onClick(e) {
        const btn = e.target.closest('.js-copy')
        if (!btn) return
        e.preventDefault()
        const url = btn.getAttribute('data-url')
        if (!url) return
        const ok = await copyText(url)
        if (ok) {
            btn.classList.add('is-copied')
            showToast('Copied to clipboard')
            setTimeout(() => btn.classList.remove('is-copied'), 1400)
        } else {
            showToast('Copy failed. Long-press to select.')
        }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
}

async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
        try { await navigator.clipboard.writeText(text); return true } catch (_) { /* fall through */ }
    }
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'; ta.style.opacity = '0'; ta.style.pointerEvents = 'none'
    document.body.appendChild(ta)
    ta.select()
    try {
        const ok = document.execCommand('copy')
        document.body.removeChild(ta)
        return ok
    } catch (_) {
        document.body.removeChild(ta)
        return false
    }
}


/* ============================================================
   Reveal observer - children cascade with stagger
   ============================================================ */

function setupRevealObserver() {
    if (typeof IntersectionObserver === 'undefined') {
        document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in-view'))
        document.querySelectorAll(CHILD_SELECTORS).forEach((el) => el.classList.add('is-in-view'))
        return
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            const target = entry.target
            target.classList.add('is-in-view')

            const items = target.querySelectorAll(CHILD_SELECTORS)
            items.forEach((item, i) => {
                const delay = Math.min(i * STAGGER_MS, STAGGER_CAP_MS)
                item.style.transitionDelay = delay + 'ms'
                requestAnimationFrame(() => item.classList.add('is-in-view'))
            })

            observer.unobserve(target)
        })
    }, {
        threshold: 0.08,
        rootMargin: '0px 0px -6% 0px'
    })

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
}


/* ============================================================
   Scroll progress bar
   ============================================================ */

function setupScrollProgress() {
    const bar = document.getElementById('scrollProgress')
    if (!bar) return

    let ticking = false
    function update() {
        const doc = document.documentElement
        const max = doc.scrollHeight - doc.clientHeight
        const pct = max > 0 ? (doc.scrollTop / max) * 100 : 0
        bar.style.width = pct + '%'
        ticking = false
    }
    function onScroll() {
        if (!ticking) { requestAnimationFrame(update); ticking = true }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => window.removeEventListener('scroll', onScroll)
}


/* ============================================================
   Topbar shadow on scroll
   ============================================================ */

function setupTopbarShadow() {
    const topbar = document.getElementById('topbar')
    if (!topbar) return

    let ticking = false
    function update() {
        const y = document.documentElement.scrollTop || document.body.scrollTop
        topbar.classList.toggle('is-scrolled', y > 8)
        ticking = false
    }
    function onScroll() {
        if (!ticking) { requestAnimationFrame(update); ticking = true }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => window.removeEventListener('scroll', onScroll)
}


/* ============================================================
   Relative timestamps (<time class="js-relative" datetime="...">)
   ============================================================ */

function setupRelativeTimes() {
    const nodes = document.querySelectorAll('.js-relative')
    if (!nodes.length) return
    const now = new Date()
    nodes.forEach((node) => {
        const iso = node.getAttribute('datetime')
        if (!iso) return
        const then = new Date(iso)
        if (Number.isNaN(then.getTime())) return
        const rel = formatRelative(now, then)
        if (rel) {
            if (!node.getAttribute('title')) node.setAttribute('title', node.textContent.trim())
            node.textContent = rel
        }
    })
}

function formatRelative(now, then) {
    const diffSec = Math.round((now - then) / 1000)
    if (Math.abs(diffSec) < 60) return 'just now'
    const minutes = Math.round(diffSec / 60)
    if (Math.abs(minutes) < 60) return labelize(minutes, 'minute')
    const hours = Math.round(diffSec / 3600)
    if (Math.abs(hours) < 24) return labelize(hours, 'hour')
    const days = Math.round(diffSec / 86400)
    if (Math.abs(days) < 7) return labelize(days, 'day')
    return null
}

function labelize(v, unit) {
    const abs = Math.abs(v)
    const plural = abs === 1 ? unit : unit + 's'
    return v > 0 ? abs + ' ' + plural + ' ago' : 'in ' + abs + ' ' + plural
}


/* ============================================================
   Anchor focus (keyboard) on in-page #links
   ============================================================ */

function setupAnchorFocus() {
    function onClick(e) {
        const link = e.target.closest('a[href^="#"]')
        if (!link) return
        const href = link.getAttribute('href')
        if (!href || href === '#') return
        const target = document.querySelector(href)
        if (!target) return
        setTimeout(() => {
            target.setAttribute('tabindex', '-1')
            target.focus({ preventScroll: true })
        }, 320)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
}


/* ============================================================
   Surface cards - read data-pct, write --pct var and the % label
   Single source of truth: change data-pct, both stay in sync.
   ============================================================ */

function setupSurfaces() {
    document.querySelectorAll('.surface[data-pct]').forEach((el) => {
        const raw = parseInt(el.getAttribute('data-pct'), 10)
        const pct = isNaN(raw) ? 0 : Math.max(0, Math.min(100, raw))
        el.style.setProperty('--pct', pct)
        const label = el.querySelector('.surface__pct')
        if (label) label.textContent = pct + '%'
    })
}
