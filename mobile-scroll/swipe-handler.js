class SwipeHandler {
  constructor(options = {}) {
    // Default options
    this.options = {
      threshold: 10, // Minimum distance to trigger swipe
      timeThreshold: 300, // Maximum time for a swipe gesture (ms)
      overswipeRatio: 1.2, // Ratio to trigger overswipe
      ...options
    };

    // Touch tracking states
    this.touchesStart = {};
    this.touchesDiff = {
      x: 0,
      y: 0
    };
    this.touchStartTime = 0;
    this.isTouched = false;
    this.isMoved = false;
    this.direction = null;
    this.element = null;

    // Bind methods to maintain context
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
  }

  /**
   * Initializes the swipe handler on a specific element
   * @param {HTMLElement} element - The element to add swipe functionality to
   */
  init(element) {
    if (!element) {
      throw new Error('Element is required');
    }
    this.element = element;
    
    // Add event listeners
    this.element.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    this.element.addEventListener('mousedown', this.handleTouchStart);
    document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    document.addEventListener('mousemove', this.handleTouchMove);
    document.addEventListener('touchend', this.handleTouchEnd);
    document.addEventListener('mouseup', this.handleTouchEnd);
  }

  /**
   * Handles the start of a touch/mouse event
   * @param {Event} e - The touch/mouse event
   */
  handleTouchStart(e) {
    this.isMoved = false;
    this.isTouched = true;
    this.direction = null;
    
    this.touchesStart.x = e.type === 'touchstart' ? e.touches[0].pageX : e.pageX;
    this.touchesStart.y = e.type === 'touchstart' ? e.touches[0].pageY : e.pageY;
    this.touchStartTime = new Date().getTime();
  }

  /**
   * Handles the movement of a touch/mouse event
   * @param {Event} e - The touch/mouse event
   */
  handleTouchMove(e) {
    if (!this.isTouched) return;

    const pageX = e.type === 'touchmove' ? e.touches[0].pageX : e.pageX;
    const pageY = e.type === 'touchmove' ? e.touches[0].pageY : e.pageY;
    
    // Calculate the distance moved in both axes
    this.touchesDiff.x = pageX - this.touchesStart.x;
    this.touchesDiff.y = pageY - this.touchesStart.y;
    
    // Determine primary direction based on which axis has more movement
    const isHorizontal = Math.abs(this.touchesDiff.x) > Math.abs(this.touchesDiff.y);
    
    // Determine swipe direction
    if (isHorizontal) {
      // Horizontal swipe
      if (this.touchesDiff.x < 0) {
        this.direction = 'left';
      } else {
        this.direction = 'right';
      }
    } else {
      // Vertical swipe
      if (this.touchesDiff.y < 0) {
        this.direction = 'up';
      } else {
        this.direction = 'down';
      }
    }
    
    // If we haven't moved yet, mark now as moved
    if (!this.isMoved) {
      this.isMoved = true;
      
      // Custom event for swipe start
      const swipeStartEvent = new CustomEvent('swipestart', {
        detail: {
          direction: this.direction,
          touchesDiff: this.touchesDiff
        }
      });
      this.element.dispatchEvent(swipeStartEvent);
    }

    // Prevent default to avoid scrolling
    if (e.cancelable) {
      e.preventDefault();
    }

    // Calculate progress (0 to 1)
    let progress;
    if (isHorizontal) {
      progress = Math.abs(this.touchesDiff.x / this.element.offsetWidth);
    } else {
      progress = Math.abs(this.touchesDiff.y / this.element.offsetHeight);
    }
    
    // Custom event for swipe progress
    const swipeMoveEvent = new CustomEvent('swipemove', { 
      detail: {
        direction: this.direction,
        touchesDiff: this.touchesDiff,
        progress: progress,
        isHorizontal: isHorizontal
      }
    });
    this.element.dispatchEvent(swipeMoveEvent);
  }

  /**
   * Handles the end of a touch/mouse event
   * @param {Event} e - The touch/mouse event
   */
  handleTouchEnd() {
    if (!this.isTouched || !this.isMoved) {
      this.isTouched = false;
      this.isMoved = false;
      return;
    }

    this.isTouched = false;
    this.isMoved = false;
    
    // Calculate time difference
    const timeDiff = new Date().getTime() - this.touchStartTime;
    
    // Check if movement was primarily horizontal or vertical
    const isHorizontal = ['left', 'right'].includes(this.direction);
    
    // Determine if this is a swipe based on time and distance
    let isSwipe = false;
    let isOverswipe = false;
    
    if (isHorizontal) {
      // For horizontal swipes
      isSwipe = (
        (timeDiff < this.options.timeThreshold && Math.abs(this.touchesDiff.x) > this.options.threshold) ||
        Math.abs(this.touchesDiff.x) > this.element.offsetWidth / 2
      );
      isOverswipe = Math.abs(this.touchesDiff.x) > this.element.offsetWidth * this.options.overswipeRatio;
    } else {
      // For vertical swipes
      isSwipe = (
        (timeDiff < this.options.timeThreshold && Math.abs(this.touchesDiff.y) > this.options.threshold) ||
        Math.abs(this.touchesDiff.y) > this.element.offsetHeight / 2
      );
      isOverswipe = Math.abs(this.touchesDiff.y) > this.element.offsetHeight * this.options.overswipeRatio;
    }
    
    // Determine action based on swipe
    const action = isSwipe ? 'swipe' : 'cancel';

    // Custom event for swipe end
    const swipeEndEvent = new CustomEvent('swipeend', {
      detail: {
        direction: this.direction,
        action: action,
        isSwipe: isSwipe,
        isOverswipe: isOverswipe,
        touchesDiff: this.touchesDiff,
        timeDiff: timeDiff,
        isHorizontal: isHorizontal
      }
    });
    this.element.dispatchEvent(swipeEndEvent);

    // Fire specific directional events
    if (isSwipe) {
      const directionEvent = new CustomEvent(`swipe${this.direction}`, {
        detail: {
          touchesDiff: this.touchesDiff,
          isOverswipe: isOverswipe,
          timeDiff: timeDiff
        }
      });
      this.element.dispatchEvent(directionEvent);
    }
  }

  /**
   * Destroy the swipe handler and remove event listeners
   */
  destroy() {
    if (!this.element) return;
    
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('mousedown', this.handleTouchStart);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('mousemove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
    document.removeEventListener('mouseup', this.handleTouchEnd);
    
    this.element = null;
  }
}

// Example usage:
/*
const swipeElement = document.querySelector('.swipe-element');
const swiper = new SwipeHandler({
  threshold: 15,
  timeThreshold: 300
});

swiper.init(swipeElement);

swipeElement.addEventListener('swipestart', (e) => {
  console.log('Swipe started:', e.detail.direction);
});

swipeElement.addEventListener('swipemove', (e) => {
  console.log('Swipe progress:', e.detail.progress);
  // Handle horizontal vs vertical movement
  if (e.detail.isHorizontal) {
    swipeElement.style.transform = `translateX(${e.detail.touchesDiff.x}px)`;
  } else {
    swipeElement.style.transform = `translateY(${e.detail.touchesDiff.y}px)`;
  }
});

swipeElement.addEventListener('swipeend', (e) => {
  console.log('Swipe ended:', e.detail);
  if (e.detail.isSwipe) {
    console.log('Swipe completed in direction:', e.detail.direction);
  } else {
    console.log('Swipe cancelled');
    // Reset element position
    swipeElement.style.transform = '';
  }
});

// Listen for specific direction events
swipeElement.addEventListener('swipeleft', (e) => {
  console.log('Swiped left!', e.detail);
});

swipeElement.addEventListener('swiperight', (e) => {
  console.log('Swiped right!', e.detail);
});

swipeElement.addEventListener('swipeup', (e) => {
  console.log('Swiped up!', e.detail);
});

swipeElement.addEventListener('swipedown', (e) => {
  console.log('Swiped down!', e.detail);
});
*/