class Util {
    forEach(elements, handler) {
        elements = elements || [];
        for (let i = 0; i < elements.length; i++) handler(elements[i]);
    }

    getScrollTop() {
        return (document.documentElement && document.documentElement.scrollTop) || document.body.scrollTop;
    }

    isMobile() {
        return window.matchMedia('only screen and (max-width: 680px)').matches;
    }

    isTocStatic() {
        return window.matchMedia('only screen and (max-width: 960px)').matches;
    }

    animateCSS(element, animation, reserved, callback) {
        if (!Array.isArray(animation)) animation = [animation];
        element.classList.add('animated', ...animation);
        const handler = () => {
            element.classList.remove('animated', ...animation);
            element.removeEventListener('animationend', handler);
            if (typeof callback === 'function') callback();
        };
        if (!reserved) element.addEventListener('animationend', handler, false);
    }
}

class Theme {
    constructor() {
        this.config = window.config;
        this.data = this.config.data;
        this.isDark = document.body.getAttribute('theme') === 'dark';
        this.util = new Util();
        this.newScrollTop = this.util.getScrollTop();
        this.oldScrollTop = this.newScrollTop;
        this.scrollEventSet = new Set();
        this.resizeEventSet = new Set();
        this.switchThemeEventSet = new Set();
        this.clickMaskEventSet = new Set();
        if (window.objectFitImages) objectFitImages();
    }

    initSVGIcon() {
        this.util.forEach(document.querySelectorAll('[data-svg-src]'), $icon => {
            fetch($icon.getAttribute('data-svg-src'))
                .then(response => response.text())
                .then(svg => {
                    const $temp = document.createElement('div');
                    $temp.insertAdjacentHTML('afterbegin', svg);
                    const $svg = $temp.firstChild;
                    $svg.setAttribute('data-svg-src', $icon.getAttribute('data-svg-src'));
                    $svg.classList.add('icon');
                    const $titleElements = $svg.getElementsByTagName('title');
                    if ($titleElements.length) $svg.removeChild($titleElements[0]);
                    $icon.parentElement.replaceChild($svg, $icon);
                })
                .catch(err => { console.error(err); });
        });
    }

    initTwemoji() {
        if (this.config.twemoji) twemoji.parse(document.body);
    }

    initMenuMobile() {
        const $menuToggleMobile = document.getElementById('menu-toggle-mobile');
        const $menuMobile = document.getElementById('menu-mobile');
        $menuToggleMobile.addEventListener('click', () => {
            document.body.classList.toggle('blur');
            $menuToggleMobile.classList.toggle('active');
            $menuMobile.classList.toggle('active');
        }, false);
        this._menuMobileOnClickMask = this._menuMobileOnClickMask || (() => {
            $menuToggleMobile.classList.remove('active');
            $menuMobile.classList.remove('active');
        });
        this.clickMaskEventSet.add(this._menuMobileOnClickMask);
    }

    initSwitchTheme() {
        this.util.forEach(document.getElementsByClassName('theme-switch'), $themeSwitch => {
            $themeSwitch.addEventListener('click', () => {
                if (document.body.getAttribute('theme') === 'dark') {
                    document.body.setAttribute('theme', 'light');
                } else {
                    document.body.setAttribute('theme', 'dark');
                }
                this.isDark = !this.isDark;
                window.localStorage && localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
                window.REMARK42.changeTheme(document.body.getAttribute('theme') === 'dark' ? 'dark' : 'light');
                for (let event of this.switchThemeEventSet) event();
            }, false);
        });
    }

    initSearch() {
        const searchConfig = this.config.search;
        const isMobile = this.util.isMobile();
        if (!searchConfig || isMobile && this._searchMobileOnce || !isMobile && this._searchDesktopOnce) return;

        const maxResultLength = searchConfig.maxResultLength ? searchConfig.maxResultLength : 10;
        const snippetLength = searchConfig.snippetLength ? searchConfig.snippetLength : 50;
        const highlightTag = searchConfig.highlightTag ? searchConfig.highlightTag : 'em';

        const suffix = isMobile ? 'mobile' : 'desktop';
        const $header = document.getElementById(`header-${suffix}`);
        const $searchInput = document.getElementById(`search-input-${suffix}`);
        const $searchToggle = document.getElementById(`search-toggle-${suffix}`);
        const $searchLoading = document.getElementById(`search-loading-${suffix}`);
        const $searchClear = document.getElementById(`search-clear-${suffix}`);
        if (isMobile) {
            this._searchMobileOnce = true;
            $searchInput.addEventListener('focus', () => {
                document.body.classList.add('blur');
                $header.classList.add('open');
            }, false);
            document.getElementById('search-cancel-mobile').addEventListener('click', () => {
                $header.classList.remove('open');
                document.body.classList.remove('blur');
                document.getElementById('menu-toggle-mobile').classList.remove('active');
                document.getElementById('menu-mobile').classList.remove('active');
                $searchLoading.style.display = 'none';
                $searchClear.style.display = 'none';
                this._searchMobile && this._searchMobile.autocomplete.setVal('');
            }, false);
            $searchClear.addEventListener('click', () => {
                $searchClear.style.display = 'none';
                this._searchMobile && this._searchMobile.autocomplete.setVal('');
            }, false);
            this._searchMobileOnClickMask = this._searchMobileOnClickMask || (() => {
                $header.classList.remove('open');
                $searchLoading.style.display = 'none';
                $searchClear.style.display = 'none';
                this._searchMobile && this._searchMobile.autocomplete.setVal('');
            });
            this.clickMaskEventSet.add(this._searchMobileOnClickMask);
        } else {
            this._searchDesktopOnce = true;
            $searchToggle.addEventListener('click', () => {
                document.body.classList.add('blur');
                $header.classList.add('open');
                $searchInput.focus();
            }, false);
            $searchClear.addEventListener('click', () => {
                $searchClear.style.display = 'none';
                this._searchDesktop && this._searchDesktop.autocomplete.setVal('');
            }, false);
            this._searchDesktopOnClickMask = this._searchDesktopOnClickMask || (() => {
                $header.classList.remove('open');
                $searchLoading.style.display = 'none';
                $searchClear.style.display = 'none';
                this._searchDesktop && this._searchDesktop.autocomplete.setVal('');
            });
            this.clickMaskEventSet.add(this._searchDesktopOnClickMask);
        }
        $searchInput.addEventListener('input', () => {
            if ($searchInput.value === '') $searchClear.style.display = 'none';
            else $searchClear.style.display = 'inline';
        }, false);

        const initAutosearch = () => {
            const autosearch = autocomplete(`#search-input-${suffix}`, {
                hint: false,
                autoselect: true,
                dropdownMenuContainer: `#search-dropdown-${suffix}`,
                clearOnSelected: true,
                cssClasses: { noPrefix: true },
                debug: true,
            }, {
                name: 'search',
                source: (query, callback) => {
                    $searchLoading.style.display = 'inline';
                    $searchClear.style.display = 'none';
                    const finish = (results) => {
                        $searchLoading.style.display = 'none';
                        $searchClear.style.display = 'inline';
                        callback(results);
                    };
                    if (searchConfig.type === 'lunr') {
                        const search = () => {
                            if (lunr.queryHandler) query = lunr.queryHandler(query);
                            const results = {};
                            this._index.search(query).forEach(({ ref, matchData: { metadata } }) => {
                                const matchData = this._indexData[ref];
                                let { uri, title, content: context } = matchData;
                                if (results[uri]) return;
                                let position = 0;
                                Object.values(metadata).forEach(({ content }) => {
                                    if (content) {
                                        const matchPosition = content.position[0][0];
                                        if (matchPosition < position || position === 0) position = matchPosition;
                                    }
                                });
                                position -= snippetLength / 5;
                                if (position > 0) {
                                    position += context.substr(position, 20).lastIndexOf(' ') + 1;
                                    context = '...' + context.substr(position, snippetLength);
                                } else {
                                    context = context.substr(0, snippetLength);
                                }
                                Object.keys(metadata).forEach(key => {
                                    title = title.replace(new RegExp(`(${key})`, 'gi'), `<${highlightTag}>$1</${highlightTag}>`);
                                    context = context.replace(new RegExp(`(${key})`, 'gi'), `<${highlightTag}>$1</${highlightTag}>`);
                                });
                                results[uri] = {
                                    'uri': uri,
                                    'title' : title,
                                    'date' : matchData.date,
                                    'context' : context,
                                };
                            });
                            return Object.values(results).slice(0, maxResultLength);
                        }
                        if (!this._index) {
                            fetch(searchConfig.lunrIndexURL)
                                .then(response => response.json())
                                .then(data => {
                                    const indexData = {};
                                    this._index = lunr(function () {
                                        if (searchConfig.lunrLanguageCode) this.use(lunr[searchConfig.lunrLanguageCode]);
                                        this.ref('objectID');
                                        this.field('title', { boost: 50 });
                                        this.field('tags', { boost: 20 });
                                        this.field('categories', { boost: 20 });
                                        this.field('content', { boost: 10 });
                                        this.metadataWhitelist = ['position'];
                                        data.forEach((record) => {
                                            indexData[record.objectID] = record;
                                            this.add(record);
                                        });
                                    });
                                    this._indexData = indexData;
                                    finish(search());
                                }).catch(err => {
                                    console.error(err);
                                    finish([]);
                                });
                        } else finish(search());
                    } else if (searchConfig.type === 'algolia') {
                        this._algoliaIndex = this._algoliaIndex || algoliasearch(searchConfig.algoliaAppID, searchConfig.algoliaSearchKey).initIndex(searchConfig.algoliaIndex);
                        this._algoliaIndex
                            .search(query, {
                                offset: 0,
                                length: maxResultLength * 8,
                                attributesToHighlight: ['title'],
                                attributesToSnippet: [`content:${snippetLength}`],
                                highlightPreTag: `<${highlightTag}>`,
                                highlightPostTag: `</${highlightTag}>`,
                            })
                            .then(({ hits }) => {
                                const results = {};
                                hits.forEach(({ uri, date, _highlightResult: { title }, _snippetResult: { content } }) => {
                                    if (results[uri] && results[uri].context.length > content.value) return;
                                    results[uri] = {
                                        uri: uri,
                                        title: title.value,
                                        date: date,
                                        context: content.value,
                                    };
                                });
                                finish(Object.values(results).slice(0, maxResultLength));
                            })
                            .catch(err => {
                                console.error(err);
                                finish([]);
                            });
                    }
                },
                templates: {
                    suggestion: ({ title, date, context }) => `<div><span class="suggestion-title">${title}</span><span class="suggestion-date">${date}</span></div><div class="suggestion-context">${context}</div>`,
                    empty: ({ query }) => `<div class="search-empty">${searchConfig.noResultsFound}: <span class="search-query">"${query}"</span></div>`,
                    footer: ({}) => {
                        const { searchType, icon, href } = searchConfig.type === 'algolia' ? {
                            searchType: 'algolia',
                            icon: '<i class="fab fa-algolia fa-fw"></i>',
                            href: 'https://www.algolia.com/',
                        } : {
                            searchType: 'Lunr.js',
                            icon: '',
                            href: 'https://lunrjs.com/',
                        };
                        return `<div class="search-footer">Search by <a href="${href}" rel="noopener noreffer" target="_blank">${icon} ${searchType}</a></div>`;},
                },
            });
            autosearch.on('autocomplete:selected', (_event, suggestion, _dataset, _context) => {
                window.location.assign(suggestion.uri);
            });
            if (isMobile) this._searchMobile = autosearch;
            else this._searchDesktop = autosearch;
        };
        if (searchConfig.lunrSegmentitURL && !document.getElementById('lunr-segmentit')) {
            const script = document.createElement('script');
            script.id = 'lunr-segmentit';
            script.type = 'text/javascript';
            script.src = searchConfig.lunrSegmentitURL;
            script.async = true;
            if (script.readyState) {
                script.onreadystatechange = () => {
                    if (script.readyState == 'loaded' || script.readyState == 'complete'){
                        script.onreadystatechange = null;
                        initAutosearch();
                    }
                };
            } else {
                script.onload = () => {
                    initAutosearch();
                };
            }
            document.body.appendChild(script);
        } else initAutosearch();
    }

    initDetails() {
        this.util.forEach(document.getElementsByClassName('details'), $details => {
            const $summary = $details.getElementsByClassName('details-summary')[0];
            $summary.addEventListener('click', () => {
                $details.classList.toggle('open');
            }, false);
        });
    }

    initLightGallery() {
        if (this.config.lightGallery) lightGallery(document.getElementById('content'), this.config.lightGallery);
    }

    initHighlight() {
        this.util.forEach(document.querySelectorAll('.highlight > pre.chroma'), $preChroma => {
            const $chroma = document.createElement('div');
            $chroma.className = $preChroma.className;
            const $table = document.createElement('table');
            $chroma.appendChild($table);
            const $tbody = document.createElement('tbody');
            $table.appendChild($tbody);
            const $tr = document.createElement('tr');
            $tbody.appendChild($tr);
            const $td = document.createElement('td');
            $tr.appendChild($td);
            $preChroma.parentElement.replaceChild($chroma, $preChroma);
            $td.appendChild($preChroma);
        });
        this.util.forEach(document.querySelectorAll('.highlight > .chroma'), $chroma => {
            const $codeElements = $chroma.querySelectorAll('pre.chroma > code');
            if ($codeElements.length) {
                const $code = $codeElements[$codeElements.length - 1];
                const $header = document.createElement('div');
                $header.className = 'code-header ' + $code.className.toLowerCase();
                const $title = document.createElement('span');
                $title.classList.add('code-title');
                $title.insertAdjacentHTML('afterbegin', '<i class="arrow fas fa-chevron-right fa-fw"></i>');
                $title.addEventListener('click', () => {
                    $chroma.classList.toggle('open');
                }, false);
                $header.appendChild($title);
                const $ellipses = document.createElement('span');
                $ellipses.insertAdjacentHTML('afterbegin', '<i class="fas fa-ellipsis-h fa-fw"></i>');
                $ellipses.classList.add('ellipses');
                $ellipses.addEventListener('click', () => {
                    $chroma.classList.add('open');
                }, false);
                $header.appendChild($ellipses);
                const $copy = document.createElement('span');
                $copy.insertAdjacentHTML('afterbegin', '<i class="far fa-copy fa-fw"></i>');
                $copy.classList.add('copy');
                const code = $code.innerText;
                if (this.config.code.maxShownLines < 0 || code.split('\n').length < this.config.code.maxShownLines + 2) $chroma.classList.add('open');
                if (this.config.code.copyTitle) {
                    $copy.setAttribute('data-clipboard-text', code);
                    $copy.title = this.config.code.copyTitle;
                    const clipboard = new ClipboardJS($copy);
                    clipboard.on('success', _e => {
                        this.util.animateCSS($code, 'flash');
                    });
                    $header.appendChild($copy);
                }
                $chroma.insertBefore($header, $chroma.firstChild);
            }
        });
    }

    initTable() {
        this.util.forEach(document.querySelectorAll('.single table'), $table => {
            const $wrapper = document.createElement('div');
            $wrapper.className = 'table-wrapper';
            $table.parentElement.replaceChild($wrapper, $table);
            $wrapper.appendChild($table);
        });
    }

    initHeaderLink() {
        for (let num = 1; num <= 6; num++) {
            this.util.forEach(document.querySelectorAll('h' + num), $header => {
                $header.classList.add('headerLink');
                $header.insertAdjacentHTML('afterbegin', `<a href="#${$header.id}" class="header-mark"></a>`);
            });
        }
    }

    initToc() {
        const $tocCore = document.getElementById('TableOfContents');
        if ($tocCore === null || typeof $tocCore === "undefined") return;
        if ($tocCore.children.length === 0) {
            const $tocTitles = document.getElementsByClassName('toc-title');
            this.util.forEach($tocTitles, $tocTitle => {$tocTitle.parentNode.remove()});
            return;
        }
        if (document.getElementById('toc-static').getAttribute('data-kept') || this.util.isTocStatic()) {
            const $tocContentStatic = document.getElementById('toc-content-static');
            if ($tocCore.parentElement !== $tocContentStatic) {
                $tocCore.parentElement.removeChild($tocCore);
                $tocContentStatic.appendChild($tocCore);
            }
            if (this._tocOnScroll) this.scrollEventSet.delete(this._tocOnScroll);
        } else {
            const $tocContentAuto = document.getElementById('toc-content-auto');
            if ($tocCore.parentElement !== $tocContentAuto) {
                $tocCore.parentElement.removeChild($tocCore);
                $tocContentAuto.appendChild($tocCore);
            }
            const $toc = document.getElementById('toc-auto');
            const $page = document.getElementsByClassName('content-block')[0];
            const rect = $page.getBoundingClientRect();
            $toc.style.left = `${rect.left + rect.width + 20}px`;
            $toc.style.maxWidth = `${$page.getBoundingClientRect().left - 20 + 314}px`;
            $toc.style.visibility = 'visible';
            const $tocLinkElements = $tocCore.querySelectorAll('a:first-child');
            const $tocLiElements = $tocCore.getElementsByTagName('li');
            const $headerLinkElements = document.getElementsByClassName('headerLink');
            const headerIsFixed = document.body.getAttribute('data-header-desktop') !== 'normal';
            const headerHeight = document.getElementById('header-desktop').offsetHeight;
            const TOP_SPACING = 20 + (headerIsFixed ? headerHeight : 0);
            const minTocTop = $toc.offsetTop;
            const minScrollTop = minTocTop - TOP_SPACING + (headerIsFixed ? 0 : headerHeight);
            this._tocOnScroll = this._tocOnScroll || (() => {
                const footerTop = document.getElementById('toc-final').offsetTop;
                const maxTocTop = footerTop - $toc.getBoundingClientRect().height;
                const maxScrollTop = maxTocTop - TOP_SPACING + (headerIsFixed ? 0 : headerHeight);
                if (this.newScrollTop < minScrollTop) {
                    $toc.style.position = 'absolute';
                    $toc.style.top = `${minTocTop}px`;
                } else if (this.newScrollTop > maxScrollTop) {
                    $toc.style.position = 'absolute';
                    $toc.style.top = `${maxTocTop}px`;
                } else {
                    $toc.style.position = 'fixed';
                    $toc.style.top = `${TOP_SPACING}px`;
                }

                let $subtitleLinkElem = document.getElementsByClassName('single-subtitle headerLink');
                let tocSubtract = $subtitleLinkElem.length > 0 ? 2 : 1;

                // Check if there's gist embed
                let $embeddedGists = []
                this.util.forEach($headerLinkElements, $headerElem => {
                    if ($headerElem.parentNode.nodeName === "ARTICLE") {
                        $embeddedGists.push($headerElem);
                    }
                })
                tocSubtract += $embeddedGists.length;

                this.util.forEach($tocLinkElements, $tocLink => { $tocLink.classList.remove('active'); });
                this.util.forEach($tocLiElements, $tocLi => { $tocLi.classList.remove('has-active'); });
                const INDEX_SPACING = 20 + (headerIsFixed ? headerHeight : 0);
                let activeTocIndex = $headerLinkElements.length - 1;
                for (let i = 0; i < $headerLinkElements.length - 1; i++) {
                    const thisTop = $headerLinkElements[i].getBoundingClientRect().top;
                    const nextTop = $headerLinkElements[i + 1].getBoundingClientRect().top;
                    if ((i === 0 && thisTop > INDEX_SPACING) || (thisTop <= INDEX_SPACING && nextTop > INDEX_SPACING)) {
                        activeTocIndex = i;
                        break;
                    }
                }
                if (activeTocIndex !== -1) {
                    let $selectedToC = $tocLinkElements[activeTocIndex - tocSubtract];
                    if (typeof $selectedToC !== "undefined") {
                        $selectedToC.classList.add('active');
                        let $parent = $selectedToC.parentElement;
                        while ($parent !== $tocCore) {
                            $parent.classList.add('has-active');
                            $parent = $parent.parentElement.parentElement;
                        }
                    }
                }
            });
            this._tocOnScroll();
            this.scrollEventSet.add(this._tocOnScroll);
        }
    }

    initMath() {
        if (this.config.math) renderMathInElement(document.body, this.config.math);
    }

    initMermaid() {
        const $mermaidElements = document.getElementsByClassName('mermaid');
        if ($mermaidElements.length) {
            mermaid.initialize({startOnLoad: false, theme: 'null'});
            this.util.forEach($mermaidElements, $mermaid => {
                mermaid.mermaidAPI.render('svg-' + $mermaid.id, this.data[$mermaid.id], svgCode => {
                    $mermaid.insertAdjacentHTML('afterbegin', svgCode);
                }, $mermaid);
            });
        }
    }

    initEcharts() {
        this._echartsOnSwitchTheme = this._echartsOnSwitchTheme || (() => {
            this._echartsArr = this._echartsArr || [];
            for (let i = 0; i < this._echartsArr.length; i++) {
                this._echartsArr[i].dispose();
            }
            this._echartsArr = [];
            this.util.forEach(document.getElementsByClassName('echarts'), $echarts => {
                const chart = echarts.init($echarts, this.isDark ? 'dark' : 'macarons', {renderer: 'svg'});
                chart.setOption(JSON.parse(this.data[$echarts.id]));
                this._echartsArr.push(chart);
            });
        });
        this.switchThemeEventSet.add(this._echartsOnSwitchTheme);
        this._echartsOnSwitchTheme();
        this._echartsOnResize = this._echartsOnResize || (() => {
            for (let i = 0; i < this._echartsArr.length; i++) {
                this._echartsArr[i].resize();
            }
        });
        this.resizeEventSet.add(this._echartsOnResize);
    }

    initMapbox() {
        if (this.config.mapbox) {
            mapboxgl.accessToken = this.config.mapbox.accessToken;
            mapboxgl.setRTLTextPlugin(this.config.mapbox.RTLTextPlugin);
            this._mapboxArr = this._mapboxArr || [];
            this.util.forEach(document.getElementsByClassName('mapbox'), $mapbox => {
                const { lng, lat, zoom, lightStyle, darkStyle, marked, navigation, geolocate, scale, fullscreen } = this.data[$mapbox.id];
                const mapbox = new mapboxgl.Map({
                    container: $mapbox,
                    center: [lng, lat],
                    zoom: zoom,
                    minZoom: .2,
                    style: this.isDark ? darkStyle : lightStyle,
                    attributionControl: false,
                });
                if (marked) {
                    new mapboxgl.Marker().setLngLat([lng, lat]).addTo(mapbox);
                }
                if (navigation) {
                    mapbox.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
                }
                if (geolocate) {
                    mapbox.addControl(new mapboxgl.GeolocateControl({
                        positionOptions: {
                            enableHighAccuracy: true,
                        },
                        showUserLocation: true,
                        trackUserLocation: true,
                    }), 'bottom-right');
                }
                if (scale) {
                    mapbox.addControl(new mapboxgl.ScaleControl());
                }
                if (fullscreen) {
                    mapbox.addControl(new mapboxgl.FullscreenControl());
                }
                mapbox.addControl(new MapboxLanguage());
                this._mapboxArr.push(mapbox);
            });
            this._mapboxOnSwitchTheme = this._mapboxOnSwitchTheme || (() => {
                this.util.forEach(this._mapboxArr, mapbox => {
                    const $mapbox = mapbox.getContainer();
                    const { lightStyle, darkStyle } = this.data[$mapbox.id];
                    mapbox.setStyle(this.isDark ? darkStyle : lightStyle);
                    mapbox.addControl(new MapboxLanguage());
                });
            });
            this.switchThemeEventSet.add(this._mapboxOnSwitchTheme);
        }
    }

    initTypeit() {
        if (this.config.typeit) {
            const typeitConfig = this.config.typeit;
            const speed = typeitConfig.speed ? typeitConfig.speed : 100;
            const cursorSpeed = typeitConfig.cursorSpeed ? typeitConfig.cursorSpeed : 1000;
            const cursorChar = typeitConfig.cursorChar ? typeitConfig.cursorChar : '|';
            Object.values(typeitConfig.data).forEach(group => {
                const typeone = (i) => {
                    const id = group[i];
                    const instance = new TypeIt(`#${id}`, {
                        strings: this.data[id],
                        speed: speed,
                        lifeLike: true,
                        cursorSpeed: cursorSpeed,
                        cursorChar: cursorChar,
                        waitUntilVisible: true,
                        afterComplete: () => {
                            if (i === group.length - 1) {
                                if (typeitConfig.duration >= 0) window.setTimeout(() => {
                                    instance.destroy();
                                }, typeitConfig.duration);
                                return;
                            }
                            instance.destroy();
                            typeone(i + 1);
                        },
                    }).go();
                };
                typeone(0);
            });
        }
    }

    initComment() {
        if (this.config.comment) {
            if (this.config.comment.gitalk) {
                this.config.comment.gitalk.body = decodeURI(window.location.href);
                const gitalk = new Gitalk(this.config.comment.gitalk);
                gitalk.render('gitalk');
            }
            if (this.config.comment.valine) new Valine(this.config.comment.valine);
            if (this.config.comment.utterances) {
                const utterancesConfig = this.config.comment.utterances;
                const script = document.createElement('script');
                script.src = 'https://utteranc.es/client.js';
                script.type = 'text/javascript';
                script.setAttribute('repo', utterancesConfig.repo);
                script.setAttribute('issue-term', utterancesConfig.issueTerm);
                if (utterancesConfig.label) script.setAttribute('label', utterancesConfig.label);
                script.setAttribute('theme', this.isDark ? utterancesConfig.darkTheme : utterancesConfig.lightTheme);
                script.crossOrigin = 'anonymous';
                script.async = true;
                document.getElementById('utterances').appendChild(script);
                this._utterancesOnSwitchTheme = this._utterancesOnSwitchTheme || (() => {
                    const message = {
                        type: 'set-theme',
                        theme: this.isDark ? utterancesConfig.darkTheme : utterancesConfig.lightTheme,
                    };
                    const iframe = document.querySelector('.utterances-frame');
                    iframe.contentWindow.postMessage(message, 'https://utteranc.es');
                });
                this.switchThemeEventSet.add(this._utterancesOnSwitchTheme);
            }
        }
    }

    initSmoothScroll() {
        if (SmoothScroll) new SmoothScroll('[href^="#"]', { speed: 300, speedAsDuration: true, header: '#header-desktop' });
    }

    initCookieconsent() {
        if (this.config.cookieconsent) cookieconsent.initialise(this.config.cookieconsent);
    }

    onScroll() {
        const $headers = [];
        if (document.body.getAttribute('data-header-desktop') === 'auto') $headers.push(document.getElementById('header-desktop'));
        if (document.body.getAttribute('data-header-mobile') === 'auto') $headers.push(document.getElementById('header-mobile'));
        if (document.getElementById('comments')) {
            const $viewComments = document.getElementById('view-comments');
            $viewComments.href = `#comments`;
            $viewComments.style.display = 'block';
        }
        const $fixedButtons = document.getElementById('fixed-buttons');
        const ACCURACY = 20, MINIMUM = 100;
        window.addEventListener('scroll', () => {
            this.newScrollTop = this.util.getScrollTop();
            const scroll = this.newScrollTop - this.oldScrollTop;
            const isMobile = this.util.isMobile();
            this.util.forEach($headers, $header => {
                if (scroll > ACCURACY) {
                    $header.classList.remove('fadeInDown');
                    this.util.animateCSS($header, ['fadeOutUp', 'faster'], true);
                } else if (scroll < - ACCURACY) {
                    $header.classList.remove('fadeOutUp');
                    this.util.animateCSS($header, ['fadeInDown', 'faster'], true);
                }
            });
            if (this.newScrollTop > MINIMUM) {
                if (isMobile && scroll > ACCURACY) {
                    $fixedButtons.classList.remove('fadeIn');
                    this.util.animateCSS($fixedButtons, ['fadeOut', 'faster'], true);
                } else if (!isMobile || scroll < - ACCURACY) {
                    $fixedButtons.style.display = 'block';
                    $fixedButtons.classList.remove('fadeOut');
                    this.util.animateCSS($fixedButtons, ['fadeIn', 'faster'], true);
                }
            } else {
                if (!isMobile) {
                    $fixedButtons.classList.remove('fadeIn');
                    this.util.animateCSS($fixedButtons, ['fadeOut', 'faster'], true);
                }
                $fixedButtons.style.display = 'none';
            }
            for (let event of this.scrollEventSet) event();
            this.oldScrollTop = this.newScrollTop;
        }, false);
    }

    onResize() {
        window.addEventListener('resize', () => {
            if (!this._resizeTimeout) {
                this._resizeTimeout = window.setTimeout(() => {
                    this._resizeTimeout = null;
                    for (let event of this.resizeEventSet) event();
                    this.initToc();
                    this.initMermaid();
                    this.initSearch();
                }, 100);
            }
        }, false);
    }

    onClickMask() {
        document.getElementById('mask').addEventListener('click', () => {
            for (let event of this.clickMaskEventSet) event();
            document.body.classList.remove('blur');
        }, false);
    }

    init() {
        try {
            this.initSVGIcon();
            this.initTwemoji();
            this.initMenuMobile();
            this.initSwitchTheme();
            this.initSearch();
            this.initDetails();
            this.initLightGallery();
            this.initHighlight();
            this.initTable();
            this.initHeaderLink();
            this.initSmoothScroll();
            this.initMath();
            this.initMermaid();
            this.initEcharts();
            this.initTypeit();
            this.initMapbox();
            this.initCookieconsent();
        } catch (err) {
            console.error(err);
        }

        window.setTimeout(() => {
            this.initToc();
            this.initComment();

            this.onScroll();
            this.onResize();
            this.onClickMask();
        }, 100);
    }
};

// A modified version of: https://github.com/Tarptaeya/repo-card
const loadRepoDOM = async () => {
    async function get(url) {
        const resp = await fetch(url);
        if (resp.status !== 200) {
            throw new Error(`Got response ${resp.status} from the API while fetching ${url}`);
        }
        return resp.json();
    }

    // const emojis = await get('https://api.github.com/emojis');
    const colors = await get('https://raw.githubusercontent.com/ozh/github-colors/master/colors.json');
    colors["Unknown"] = {
        "color": "#565656",
        "url": "https://github.com/"
    }

    document.querySelectorAll('.repo-card').forEach(async function(el) {
        const name = el.getAttribute('data-repo');

        let data;
        try {
            data = await get(`https://api.github.com/repos/${name}`);
        } catch (e) {
            console.error(`Failed to load repository info, using fallback...`, e.traceback);
            const [username, reponame] = name.split("/");
            data = {
                html_url: `https://github.com/${name}`,
                description: "Failed to load repository info...",
                name: reponame,
                owner: {
                    login: username,
                },
                stargazers_count: 0,
                forks: 0,
                language: "Unknown"
            }
        }

        // data.description = (data.description || '').replace(/:\w+:/g, function(match) {
        //     const name = match.substring(1, match.length - 1);
        //     const emoji = emojis[name];

        //     if (emoji) {
        //         return `<span><img src="${emoji}" style="width: 1rem; height: 1rem; vertical-align: -0.2rem;"></span>`;
        //     }

        //     return match;
        // });

        el.innerHTML = `
            <div class="repo-main">
                <div style="display: flex; align-items: center;">
                    <svg style="fill: #606a75;margin-right: 8px;" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
                    <span style="font-weight: 600; color: #0366d6;">
                        <a class="repo-link" href="${data.html_url}">${data.owner.login}/${data.name}</a>
                    </span>
                </div>
                <div class="repo-desc-forked" style="display: ${data.fork ? 'block' : 'none'}">Forked from <a class="repo-link" href="${data.fork ? data.source.html_url : ''}">${data.fork ? data.source.full_name : ''}</a></div>
                <div class="repo-desc">${data.description}</div>
                <div class="repo-footer">
                    <div style="${data.language ? '' : 'display: none'}; margin-right: 16px;">
                        <span style="width: 12px; height: 12px; border-radius: 100%; background-color: ${data.language ? colors[data.language].color : ''}; display: inline-block; top: 1px; position: relative;"></span>
                        <span>${data.language}</span>
                    </div>
                    <div style="display: ${data.stargazers_count == 0 ? 'none' : 'flex'}; align-items: center; margin-right: 16px;">
                        <svg style="fill: #FBCA04;" aria-label="stars" viewBox="0 0 16 16" version="1.1" width="16" height="16" role="img"><path fill-rule="evenodd" d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25zm0 2.445L6.615 5.5a.75.75 0 01-.564.41l-3.097.45 2.24 2.184a.75.75 0 01.216.664l-.528 3.084 2.769-1.456a.75.75 0 01.698 0l2.77 1.456-.53-3.084a.75.75 0 01.216-.664l2.24-2.183-3.096-.45a.75.75 0 01-.564-.41L8 2.694v.001z"><title>Stargazers</title></path></svg>
                        &nbsp; <span>${data.stargazers_count}</span>
                    </div>
                    <div style="display: ${data.forks == 0 ? 'none' : 'flex'}; align-items: center;">
                        <svg style="fill: #586069;" aria-label="fork" viewBox="0 0 16 16" version="1.1" width="16" height="16" role="img"><path fill-rule="evenodd" d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878zm3.75 7.378a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3-8.75a.75.75 0 100-1.5.75.75 0 000 1.5z"><title>Forks</title></path></svg>
                        &nbsp; <span>${data.forks}</span>
                    </div>
                </div>
            </div>
        `;
    });
}

// Code based on emgithub.com
const loadGitHubCodeEmbed = async () => {
    async function getCode(user, repo, branch, path) {
        const rawFile = `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${path}`;
        const resp = await fetch(rawFile);
        return [resp.ok, resp.ok ? await resp.text() : `${resp.status} - ${resp.statusText}`];
    }
    function isNullUndef(data) {
        if (typeof data === "undefined" || data === null) {
            return true;
        }
        return false;
    }
    const isDark = document.getElementsByTagName("body")[0].getAttribute("theme") === "dark";

    function generateEmbed(targetContainer, codeText, fileName, fileUrl, rawFileUrl, lang, branchName, startLine, endLine, tabSize = 4) {
        const fileContainer = document.createElement("div");
        fileContainer.style.margin = "1em 0";
      
        const code = document.createElement("code");
        code.style.padding = "1em";
        code.style.display = "flex";

        code.style.borderRadius = "0.3rem 0.3rem 0 0";
        code.style.border = "1px solid #555";
        code.classList.add(lang);
        if (startLine > 0) {
            let codeTextSplit = codeText.split("\n");
            let endLineText = "";
            if (endLine === -1) {
                endLine = codeTextSplit.length;
            } else {
                endLineText = `-L${endLine}`;
            }
            if (startLine === endLine) {
                endLineText = "";
            }
            // If the start line is bigger than the total file line, only print out the last line
            if (startLine > codeTextSplit.length) {
                startLine = endLine = codeTextSplit.length;
                endLineText = "";
            }
            fileUrl += `#L${startLine}${endLineText}`;
            code.textContent = codeTextSplit.slice(startLine - 1, endLine).join("\n");
        } else {
            code.textContent = codeText;
        }
        if (typeof hljs != "undefined" && typeof hljs.highlightBlock != "undefined") {
            hljs.highlightBlock(code);
        }
        if (typeof hljs != "undefined" && typeof hljs.lineNumbersBlock != "undefined") {
            hljs.lineNumbersBlock(code, {
                singleLine: true,
                startFrom: startLine > 0 ? Number.parseInt(startLine) : 1
            });
        }

        // Not use a real `pre` to avoid style being overwritten
        // Simulate a real one by using its default style
        const customPre = document.createElement("div");
        customPre.style.whiteSpace = "pre";
        customPre.style.tabSize = tabSize;
        customPre.style.wordBreak = "break-word";
        customPre.style.wordWrap = "break-word";
        customPre.appendChild(code);
        fileContainer.appendChild(customPre);

        if (["master", "main"].indexOf(branchName.toLowerCase()) === -1) {
            let branchExt = `@${branchName}`;
            // https://docs.github.com/en/github/getting-started-with-github/github-glossary#commit-id
            if (branchName.length === 40) {
                branchExt = branchExt.slice(0, 8);
            }
            fileName += branchExt;
        }

        const meta = document.createElement("div");
        meta.innerHTML = `<a target="_blank" href="${rawFileUrl}" style="float: right;">view raw</a>
        <a target="_blank" href="${fileUrl}">${fileName}</a>
        hosted <span class="hide-in-phone">with ❤ </span>by <a target="_blank" href="https://github.com">GitHub</a>`;
        meta.classList.add("file-meta");
        meta.style.borderTop = "0";
        meta.classList.add("file-meta-dark");
        meta.style.border = "1px solid #555";
        fileContainer.appendChild(meta);
        targetContainer.innerHTML = "";
        targetContainer.appendChild(fileContainer);
    }

    document.querySelectorAll('.gh-code-embed').forEach(async (el) => {
        const userName = el.getAttribute("data-user");
        const repoName = el.getAttribute("data-repo");
        const branch = el.getAttribute("data-branch") || "master";
        const path = el.getAttribute("data-filepath");
        let tabSize = el.getAttribute("data-tabsize") || 4;
        tabSize = isNaN(parseInt(tabSize)) ? 4 : parseInt(tabSize);
        let lineStart = el.getAttribute("data-line-start");
        let lineEnd = el.getAttribute("data-line-end");
        lineStart = isNaN(parseInt(lineStart)) ? -1 : parseInt(lineStart);
        lineEnd = isNaN(parseInt(lineEnd)) ? -1 : parseInt(lineEnd);

        if (isNullUndef(userName) || isNullUndef(repoName) || isNullUndef(path)) {
            // Remove and dont render
            el.remove();
            return;
        }
        const splitPath = path.split("/");

        if (lineStart !== -1) {
            if (lineStart > lineEnd && lineEnd !== -1) {
                // Make sure end line is not bigger than start line, if it's set the end same as the start.
                lineEnd = lineStart;
            }
        } else if (lineEnd !== -1 && lineStart === -1) {
            lineStart = 1;
        }

        const fileName = splitPath[splitPath.length - 1];
        let fileExt = fileName.split(".")[fileName.split(".").length - 1];

        const [isOk, codeContents] = await getCode(userName, repoName, branch, path);

        const fileUrl = `https://github.com/${userName}/${repoName}/blob/${branch}/${path}`;
        const rawFile = `https://raw.githubusercontent.com/${userName}/${repoName}/${branch}/${path}`;

        fileExt = isOk ? fileExt : "plaintext";
        generateEmbed(el, codeContents, fileName, fileUrl, rawFile, fileExt, branch, lineStart, lineEnd, tabSize);
    });
}

const themeInit = () => {
    const theme = new Theme();
    theme.init();
};

if (document.readyState !== 'loading') {
    themeInit();
} else {
    document.addEventListener('DOMContentLoaded', themeInit, false);
    document.addEventListener('DOMContentLoaded', loadRepoDOM);
    document.addEventListener('DOMContentLoaded', loadGitHubCodeEmbed);
}
