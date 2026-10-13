document.addEventListener("DOMContentLoaded", () => {
    const preloader = document.querySelector('.preloader');
    const grid = document.querySelector('.grid-container');
    const text = document.querySelector('.intro-text');
    
    setTimeout(() => { grid.classList.add('drawn'); }, 100);
    setTimeout(() => { text.classList.add('show'); }, 1500);
    setTimeout(() => { 
        text.classList.remove('show');
        text.classList.add('hide'); 
    }, 4000);
    setTimeout(() => { 
        grid.classList.remove('drawn');
        grid.classList.add('reversing'); 
    }, 4500);
    setTimeout(() => { 
        preloader.classList.add('hide-preloader');
        document.body.classList.add('loaded'); 
    }, 6000);

    const filterButtons = document.querySelectorAll('.filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    let isAnimating = false;

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (isAnimating || button.classList.contains('active')) return;
            isAnimating = true;

            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const filterValue = button.getAttribute('data-filter');

            const itemsToHide = [];
            const itemsToShow = [];
            const itemsToMove = [];

            portfolioItems.forEach(item => {
                const isCurrentlyVisible = !item.classList.contains('hide');
                const shouldBeVisible = filterValue === 'all' || item.classList.contains(filterValue);

                if (isCurrentlyVisible && !shouldBeVisible) {
                    itemsToHide.push(item);
                } else if (!isCurrentlyVisible && shouldBeVisible) {
                    itemsToShow.push(item);
                } else if (isCurrentlyVisible && shouldBeVisible) {
                    itemsToMove.push(item);
                }
            });

            itemsToHide.forEach(item => {
                item.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
                item.style.opacity = '0';
                item.style.setProperty('--flip-scale', '0.5');
            });

            const delay = itemsToHide.length > 0 ? 400 : 0;

            setTimeout(() => {
                const firstRects = new Map();
                itemsToMove.forEach(item => {
                    firstRects.set(item, item.getBoundingClientRect());
                });

                itemsToHide.forEach(item => item.classList.add('hide'));
                
                itemsToShow.forEach(item => {
                    item.classList.remove('hide');
                    item.style.transition = 'none';
                    item.style.opacity = '0';
                    item.style.setProperty('--flip-scale', '0.5');
                });

                itemsToShow.forEach(item => item.offsetHeight);

                requestAnimationFrame(() => {
                    itemsToMove.forEach(item => {
                        const first = firstRects.get(item);
                        const last = item.getBoundingClientRect();
                        const dx = first.left - last.left;
                        const dy = first.top - last.top;

                        item.style.transition = 'none';
                        item.style.setProperty('--flip-x', `${dx}px`);
                        item.style.setProperty('--flip-y', `${dy}px`);
                    });

                    requestAnimationFrame(() => {
                        itemsToMove.forEach(item => {
                            item.style.transition = 'transform 0.5s cubic-bezier(0.4, 0.0, 0.2, 1)';
                            item.style.setProperty('--flip-x', `0px`);
                            item.style.setProperty('--flip-y', `0px`);
                        });

                        itemsToShow.forEach(item => {
                            item.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
                            item.style.opacity = '1';
                            item.style.setProperty('--flip-scale', '1');
                        });

                        setTimeout(() => {
                            isAnimating = false;
                        }, 500);
                    });
                });
            }, delay);
        });
    });

    const modal = document.getElementById('projectModal');
    const modalContent = document.querySelector('.modal-content');
    const closeModal = document.querySelector('.close-modal');
    const modalGallery = document.getElementById('modalGallery');
    const modalInfoArea = document.getElementById('modalInfoArea');
    let modalCloseTimeout;

    let isZoomed = false;
    let isDragging = false;
    let startX, startY, translateX = 0, translateY = 0;
    let activeImage = null;

    function resetZoom() {
        isZoomed = false;
        translateX = 0; translateY = 0;
        const container = document.querySelector('.slider-container');
        if (container) container.style.overflowX = 'auto'; 

        document.querySelectorAll('.modal-gallery img').forEach(img => {
            img.classList.remove('zoomed-img', 'dragging');
            img.style.transform = '';
        });
        const zoomBtn = document.querySelector('.zoom-btn');
        if(zoomBtn) zoomBtn.classList.remove('active');
        activeImage = null;
    }

    function renderGalleryMedia(srcString, type, folder = '') {
        modalGallery.innerHTML = '';
        if(!srcString) return;
        
        const srcs = srcString.split(',').map(s => folder + s.trim());

        if (type === 'video') {
            modalGallery.innerHTML = `<video controls autoplay style="width: 100%; max-height: 100%; border-radius: 10px; outline: none;"><source src="${srcs[0]}" type="video/mp4"></video>`;
        } else {
            let zoomBtnHTML = `
                <div class="zoom-btn-container">
                    <button class="zoom-btn" title="Zoom / Pan">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                    </button>
                </div>`;
            
            if (srcs.length > 1) {
                let imgs = srcs.map(s => `<img src="${s}" class="gallery-slide" draggable="false">`).join('');
                modalGallery.innerHTML = `
                    ${zoomBtnHTML}
                    <button class="slider-arrow prev-arrow disabled">&#10094;</button>
                    <div class="slider-container">${imgs}</div>
                    <button class="slider-arrow next-arrow">&#10095;</button>
                `;
                
                const container = modalGallery.querySelector('.slider-container');
                const prevBtn = modalGallery.querySelector('.prev-arrow');
                const nextBtn = modalGallery.querySelector('.next-arrow');

                // وضعیت اولیه قاطع برای دکمه‌ها
                prevBtn.classList.add('disabled');
                nextBtn.classList.remove('disabled');

                const updateArrows = () => {
                    const slideWidth = container.clientWidth;
                    // جلوگیری از خطای محاسبه در زمان اجرای انیمیشن‌های سنگین یا وقتی کادر نامرئی است
                    if (slideWidth < 20) return; 
                    
                    if (container.scrollLeft <= 10) prevBtn.classList.add('disabled');
                    else prevBtn.classList.remove('disabled');
                    
                    if (container.scrollLeft >= container.scrollWidth - slideWidth - 10) nextBtn.classList.add('disabled');
                    else nextBtn.classList.remove('disabled');
                };

                prevBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    resetZoom();
                    container.scrollBy({ left: -container.clientWidth, behavior: 'smooth' });
                });
                nextBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    resetZoom();
                    container.scrollBy({ left: container.clientWidth, behavior: 'smooth' });
                });
                
                container.addEventListener('scroll', updateArrows);
                
                // استفاده از سنسور هوشمند برای رفع باگ غیب شدن دکمه‌ها
                const resizeObserver = new ResizeObserver(() => {
                    updateArrows();
                });
                resizeObserver.observe(container);

            } else {
                modalGallery.innerHTML = `
                    ${zoomBtnHTML}
                    <img src="${srcs[0]}" style="width: 100%; max-height: 100%; object-fit: contain; border-radius: 10px;" draggable="false">
                `;
            }

            const zoomBtn = modalGallery.querySelector('.zoom-btn');
            if(zoomBtn) {
                zoomBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    if (isZoomed) {
                        resetZoom();
                    } else {
                        isZoomed = true;
                        zoomBtn.classList.add('active');
                        const container = modalGallery.querySelector('.slider-container');
                        const imgs = modalGallery.querySelectorAll('img');

                        if (imgs.length > 1 && container) {
                            container.style.overflowX = 'hidden'; 
                            let activeIndex = Math.round(container.scrollLeft / container.clientWidth);
                            if (isNaN(activeIndex) || activeIndex < 0) activeIndex = 0;
                            activeImage = imgs[activeIndex];
                        } else {
                            activeImage = imgs[0];
                        }

                        if (activeImage) {
                            activeImage.classList.add('zoomed-img');
                            translateX = 0; translateY = 0;
                            activeImage.style.transform = `scale(2) translate(0px, 0px)`;
                        }
                    }
                });
            }
        }
    }

    portfolioItems.forEach(item => {
        item.addEventListener('click', () => {
            clearTimeout(modalCloseTimeout);
            resetZoom();
            modalContent.classList.remove('photo-selection-state');
            
            const title = item.querySelector('h3').innerText;
            const category = item.querySelector('p').innerText;
            const type = item.getAttribute('data-type');
            const folder = item.getAttribute('data-folder') || '';

            if (type === 'photo-hub') {
                modalContent.style.transition = 'none';
                modalContent.classList.add('photo-selection-state');
                
                const dataDiv = item.querySelector('.photo-data');
                const baseFolder = dataDiv.getAttribute('data-folder-base') || '';
                
                const categories = {
                    'Street Style': dataDiv.getAttribute('data-street'),
                    'Lifestyle': dataDiv.getAttribute('data-life'),
                    'Industrial': dataDiv.getAttribute('data-ind'),
                    'Event': dataDiv.getAttribute('data-event')
                };

                let navBtnsHTML = Object.keys(categories).map(cat =>
                    `<button class="sub-cat-btn" data-cat="${cat}">${cat}</button>`
                ).join('');

                modalInfoArea.innerHTML = `
                    <h3 id="modalTitle">${title}</h3>
                    <span id="modalCategory" class="modal-cat">${category}</span>
                    <p>Select a category below to explore the photo collections.</p>
                    <div class="photo-sub-nav">${navBtnsHTML}</div>
                `;

                modalGallery.innerHTML = '';
                
                modalContent.offsetHeight; 
                modalContent.style.transition = '';
                modal.classList.add('active');

                modalInfoArea.querySelectorAll('.sub-cat-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        if(e.target.classList.contains('active')) return;
                        
                        modalInfoArea.querySelectorAll('.sub-cat-btn').forEach(b => b.classList.remove('active'));
                        e.target.classList.add('active');
                        resetZoom();
                        
                        modalContent.classList.remove('photo-selection-state');
                        renderGalleryMedia(categories[e.target.getAttribute('data-cat')], 'image', baseFolder);
                    });
                });

            } else {
                modalContent.style.transition = 'none';
                modalContent.classList.remove('photo-selection-state');
                
                const src = item.getAttribute('data-src');
                modalInfoArea.innerHTML = `
                    <h3 id="modalTitle">${title}</h3>
                    <span id="modalCategory" class="modal-cat">${category}</span>
                    <p>This project involved comprehensive design and content creation strategies tailored to the client's visual identity. Specific details and tools utilized will be showcased here.</p>
                `;
                renderGalleryMedia(src, type, folder);
                
                modalContent.offsetHeight; 
                modalContent.style.transition = '';
                modal.classList.add('active');
            }
        });
    });

    function dragStart(e) {
        if(!isZoomed || !activeImage || e.target !== activeImage) return;
        isDragging = true;
        activeImage.classList.add('dragging');

        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

        startX = clientX - translateX;
        startY = clientY - translateY;
    }

    function drag(e) {
        if(!isDragging || !isZoomed || !activeImage) return;
        e.preventDefault(); 
        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

        translateX = clientX - startX;
        translateY = clientY - startY;

        activeImage.style.transform = `scale(2) translate(${translateX/2}px, ${translateY/2}px)`;
    }

    function dragEnd() {
        if(!isDragging || !activeImage) return;
        isDragging = false;
        activeImage.classList.remove('dragging');
    }

    modalGallery.addEventListener('mousedown', dragStart);
    modalGallery.addEventListener('touchstart', dragStart, {passive: false});
    window.addEventListener('mousemove', drag);
    window.addEventListener('touchmove', drag, {passive: false});
    window.addEventListener('mouseup', dragEnd);
    window.addEventListener('touchend', dragEnd);

    closeModal.addEventListener('click', () => {
        modal.classList.remove('active');
        clearTimeout(modalCloseTimeout);
        modalCloseTimeout = setTimeout(() => { 
            modalGallery.innerHTML = ''; 
            resetZoom(); 
            modalContent.classList.remove('photo-selection-state'); 
        }, 500); 
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            clearTimeout(modalCloseTimeout);
            modalCloseTimeout = setTimeout(() => { 
                modalGallery.innerHTML = ''; 
                resetZoom(); 
                modalContent.classList.remove('photo-selection-state'); 
            }, 500);
        }
    });
});
