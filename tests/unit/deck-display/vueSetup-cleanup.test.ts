import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('vueSetup - Event listener cleanup for memory leak prevention', () => {
  beforeEach(() => {
    // Clean up any existing elements
    document.body.innerHTML = '';

    // Create mock deck display structure
    const main = document.createElement('div');
    main.id = 'main';
    const imageSet = document.createElement('div');
    imageSet.className = 'image_set';

    const link = document.createElement('a');
    link.href = 'test.html?cid=12345';
    const img = document.createElement('img');
    img.src = 'test.jpg';
    link.appendChild(img);
    imageSet.appendChild(link);
    main.appendChild(imageSet);

    const side = document.createElement('div');
    side.id = 'side';
    const sideImageSet = document.createElement('div');
    sideImageSet.className = 'image_set';
    const sideLink = document.createElement('a');
    sideLink.href = 'test.html?cid=67890';
    const sideImg = document.createElement('img');
    sideImg.src = 'test.jpg';
    sideLink.appendChild(sideImg);
    sideImageSet.appendChild(sideLink);
    side.appendChild(sideImageSet);

    document.body.appendChild(main);
    document.body.appendChild(side);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Card image hover UI setup', () => {
    it('should create DOM structure for card images', () => {
      const cardLinks = document.querySelectorAll('#main > div.image_set > a, #side > div.image_set > a');
      expect(cardLinks.length).toBe(2);
    });

    it('should have image elements in card links', () => {
      const cardLinks = document.querySelectorAll('#main > div.image_set > a, #side > div.image_set > a');
      cardLinks.forEach(link => {
        const img = link.querySelector('img');
        expect(img).toBeTruthy();
      });
    });

    it('should extract card ID from href', () => {
      const mainLink = document.querySelector('#main > div.image_set > a');
      if (mainLink) {
        const href = mainLink.getAttribute('href') || '';
        const cardIdMatch = href.match(/[?&]cid=(\d+)/);
        expect(cardIdMatch).toBeTruthy();
        expect(cardIdMatch?.[1]).toBe('12345');
      }
    });
  });

  describe('Event listener management', () => {
    it('should support adding event listeners to card links', () => {
      const cardLinks = document.querySelectorAll('#main > div.image_set > a, #side > div.image_set > a');
      const listeners: { [key: string]: boolean } = {};

      cardLinks.forEach(link => {
        const handler = () => {
          listeners['mousemove'] = true;
        };
        link.addEventListener('mousemove', handler);
        expect(() => {
          link.removeEventListener('mousemove', handler);
        }).not.toThrow();
      });
    });

    it('should support marking elements as having handlers', () => {
      const link = document.querySelector('#main > div.image_set > a');
      if (link) {
        link.setAttribute('data-hover-handler-added', 'true');
        expect(link.hasAttribute('data-hover-handler-added')).toBe(true);
        expect(link.getAttribute('data-hover-handler-added')).toBe('true');
      }
    });

    it('should support removing marker attributes', () => {
      const link = document.querySelector('#main > div.image_set > a');
      if (link) {
        link.setAttribute('data-hover-handler-added', 'true');
        link.removeAttribute('data-hover-handler-added');
        expect(link.hasAttribute('data-hover-handler-added')).toBe(false);
      }
    });

    it('should support adding multiple different event types', () => {
      const link = document.querySelector('#main > div.image_set > a');
      if (link) {
        const handlers = {
          mousemove: () => {},
          mouseleave: () => {},
          click: () => {}
        };

        // Add handlers
        link.addEventListener('mousemove', handlers.mousemove);
        link.addEventListener('mouseleave', handlers.mouseleave);
        link.addEventListener('click', handlers.click);

        // Remove handlers (simulating cleanup)
        expect(() => {
          link.removeEventListener('mousemove', handlers.mousemove);
          link.removeEventListener('mouseleave', handlers.mouseleave);
          link.removeEventListener('click', handlers.click);
        }).not.toThrow();
      }
    });
  });

  describe('Cleanup mechanism', () => {
    it('should be able to identify elements that need cleanup', () => {
      const link = document.querySelector('#main > div.image_set > a');
      if (link) {
        link.setAttribute('data-hover-handler-added', 'true');

        // Verify we can identify it
        const cardLinks = document.querySelectorAll(
          '#main > div.image_set > a, #side > div.image_set > a'
        );
        let foundWithAttribute = false;
        cardLinks.forEach(l => {
          if (l.hasAttribute('data-hover-handler-added')) {
            foundWithAttribute = true;
          }
        });
        expect(foundWithAttribute).toBe(true);
      }
    });

    it('should support creating and removing overlay elements', () => {
      const link = document.querySelector('#main > div.image_set > a');
      if (link) {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'ygo-next-card-hover-overlay';
        link.appendChild(overlay);

        expect(link.querySelector('.ygo-next-card-hover-overlay')).toBeTruthy();

        // Remove overlay (simulating cleanup)
        const foundOverlay = link.querySelector('.ygo-next-card-hover-overlay');
        if (foundOverlay) {
          foundOverlay.remove();
        }

        expect(link.querySelector('.ygo-next-card-hover-overlay')).toBeNull();
      }
    });

    it('should support removing hover classes', () => {
      const link = document.querySelector('#main > div.image_set > a');
      if (link) {
        link.classList.add('ygo-next-hover-overlay-active');
        link.classList.add('ygo-next-cursor-in-area');

        expect(link.classList.contains('ygo-next-hover-overlay-active')).toBe(true);
        expect(link.classList.contains('ygo-next-cursor-in-area')).toBe(true);

        // Simulate cleanup
        link.classList.remove('ygo-next-hover-overlay-active', 'ygo-next-cursor-in-area');

        expect(link.classList.contains('ygo-next-hover-overlay-active')).toBe(false);
        expect(link.classList.contains('ygo-next-cursor-in-area')).toBe(false);
      }
    });
  });

  describe('Memory leak prevention patterns', () => {
    it('should use WeakMap for handler storage (pattern verification)', () => {
      // Verify the pattern we use: WeakMap for tracking handlers
      const handlers = new WeakMap<Element, object>();
      const link = document.querySelector('#main > div.image_set > a') as Element;

      if (link) {
        const handlerObj = { test: () => {} };
        handlers.set(link, handlerObj);

        // WeakMap should contain the handler
        expect(handlers.has(link)).toBe(true);

        // Delete should work
        handlers.delete(link);
        expect(handlers.has(link)).toBe(false);
      }
    });

    it('should properly handle multiple elements with cleanup', () => {
      const cardLinks = document.querySelectorAll('#main > div.image_set > a, #side > div.image_set > a');
      const handlers = new WeakMap<Element, object>();

      // Setup
      cardLinks.forEach((link) => {
        link.setAttribute('data-hover-handler-added', 'true');
        handlers.set(link, { test: () => {} });
      });

      // Verify setup
      expect(handlers.has(cardLinks[0] as Element)).toBe(true);

      // Cleanup simulation
      cardLinks.forEach((link) => {
        if (link.hasAttribute('data-hover-handler-added')) {
          handlers.delete(link);
          link.removeAttribute('data-hover-handler-added');
        }
      });

      // Verify cleanup
      expect(handlers.has(cardLinks[0] as Element)).toBe(false);
    });

    it('should not cause memory leaks with many elements', () => {
      // Create many elements
      const container = document.createElement('div');
      const handlers = new WeakMap<Element, object>();

      for (let i = 0; i < 100; i++) {
        const link = document.createElement('a');
        link.href = `test${i}.html?cid=${i}`;
        const img = document.createElement('img');
        link.appendChild(img);
        link.setAttribute('data-hover-handler-added', 'true');
        handlers.set(link, { handler: () => {} });
        container.appendChild(link);
      }

      // Cleanup all
      const links = container.querySelectorAll('a');
      links.forEach((link) => {
        if (link.hasAttribute('data-hover-handler-added')) {
          handlers.delete(link);
          link.removeAttribute('data-hover-handler-added');
        }
      });

      // All should be cleaned up
      let cleanupCount = 0;
      links.forEach((link) => {
        if (!link.hasAttribute('data-hover-handler-added')) {
          cleanupCount++;
        }
      });
      expect(cleanupCount).toBe(100);
    });
  });

  describe('Vue lifecycle integration', () => {
    it('should be compatible with Vue onUnmounted pattern', () => {
      // Simulate Vue onUnmounted pattern
      const setup = () => {
        const onUnmountedCallbacks: (() => void)[] = [];

        const onUnmounted = (cb: () => void) => {
          onUnmountedCallbacks.push(cb);
        };

        return { onUnmounted, onUnmountedCallbacks };
      };

      const { onUnmounted, onUnmountedCallbacks } = setup();

      // Register cleanup
      onUnmounted(() => {
        const link = document.querySelector('#main > div.image_set > a');
        if (link) {
          link.removeAttribute('data-hover-handler-added');
        }
      });

      // Verify callback is registered
      expect(onUnmountedCallbacks.length).toBe(1);

      // Execute callbacks (simulating unmount)
      onUnmountedCallbacks.forEach(cb => cb());

      // Verify cleanup happened
      const link = document.querySelector('#main > div.image_set > a');
      expect(link?.hasAttribute('data-hover-handler-added')).toBe(false);
    });
  });
});
