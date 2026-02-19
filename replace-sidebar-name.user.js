// ==UserScript==
// @name         사이드바 지능형 분석 → 분석
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  benevolent-gumdrop 사이드바 "지능형 분석"을 "분석"으로 변경
// @author       You
// @match        https://benevolent-gumdrop-711b53.netlify.app/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    function replaceText() {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        let node;
        while (node = walker.nextNode()) {
            if (node.textContent.trim() === '지능형 분석') {
                node.textContent = node.textContent.replace('지능형 분석', '분석');
            }
        }
    }

    replaceText();

    const observer = new MutationObserver(() => {
        replaceText();
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();
