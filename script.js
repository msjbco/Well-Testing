// Dynamic testimonial animation with random positioning (no overlapping)
const slides = document.querySelectorAll('.slide');
const slider = document.querySelector('.slider');
let currentIndex = 0;
const MIN_SPACING = 40; // Minimum space between testimonials (increased for better separation)
const usedPositions = []; // Track positions that have been used

// Get actual rendered dimensions of a slide
function getSlideDimensions() {
  if (!slides || slides.length === 0) return { width: 400, height: 220 };
  
  // Try to get dimensions from any visible slide first
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    if (slide.classList.contains('visible')) {
      const rect = slide.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return {
          width: rect.width,
          height: rect.height
        };
      }
    }
  }
  
  // If no visible slide, try first slide (even if hidden)
  const firstSlide = slides[0];
  if (firstSlide) {
    // Temporarily make it visible to measure
    const wasVisible = firstSlide.classList.contains('visible');
    if (!wasVisible) {
      firstSlide.style.visibility = 'hidden';
      firstSlide.style.display = 'block';
    }
    const rect = firstSlide.getBoundingClientRect();
    if (!wasVisible) {
      firstSlide.style.visibility = '';
      firstSlide.style.display = '';
    }
    
    if (rect.width > 0 && rect.height > 0) {
      return {
        width: rect.width,
        height: rect.height
      };
    }
  }
  
  // Default dimensions
  return { width: 400, height: 220 };
}

// Check if two rectangles overlap
function doRectsOverlap(rect1, rect2, spacing) {
  return !(
    rect1.right + spacing < rect2.left ||
    rect1.left > rect2.right + spacing ||
    rect1.bottom + spacing < rect2.top ||
    rect1.top > rect2.bottom + spacing
  );
}

// Get all currently visible testimonial positions using stored style values
function getVisiblePositions() {
  const positions = [];
  const dimensions = getSlideDimensions();
  
  slides.forEach((slide, index) => {
    // Check if slide is visible and has position set
    if (slide.classList.contains('visible')) {
      const leftStr = slide.style.left;
      const topStr = slide.style.top;
      
      if (leftStr && topStr) {
        // Parse the pixel values directly from style
        const left = parseInt(leftStr) || 0;
        const top = parseInt(topStr) || 0;
        
        if (left > 0 && top > 0) {
          positions.push({
            left: left,
            top: top,
            right: left + dimensions.width,
            bottom: top + dimensions.height
          });
        }
      }
    }
  });
  return positions;
}

// Get random position within slider bounds that doesn't overlap
function getRandomPosition() {
  if (!slider) return { left: '30px', top: '30px' };
  
  // Get actual dimensions
  const dimensions = getSlideDimensions();
  
  // Get container dimensions - use offsetWidth/Height for more reliable values
  let sliderWidth = slider.offsetWidth;
  let sliderHeight = slider.offsetHeight;
  
  // Fallback to getBoundingClientRect if needed
  if (sliderWidth === 0 || sliderHeight === 0) {
    const sliderRect = slider.getBoundingClientRect();
    sliderWidth = sliderRect.width || 900;
    sliderHeight = sliderRect.height || 400;
  }
  
  // Ensure we have valid dimensions
  if (dimensions.width === 0) dimensions.width = 400;
  if (dimensions.height === 0) dimensions.height = 220;
  
  // Calculate available space with padding
  const padding = 30;
  const availableWidth = Math.max(50, sliderWidth - dimensions.width - (padding * 2));
  const availableHeight = Math.max(50, sliderHeight - dimensions.height - (padding * 2));
  
  // Get currently visible positions
  const visiblePos = getVisiblePositions();
  
  // Combine visible positions with recently used positions to avoid clustering
  const allBlockedPositions = [...visiblePos];
  for (const used of usedPositions) {
    // Only consider recently used positions (within last 10 seconds worth)
    allBlockedPositions.push({
      left: used.left,
      top: used.top,
      right: used.left + dimensions.width,
      bottom: used.top + dimensions.height
    });
  }
  
  // Try to find a non-overlapping position (max 200 attempts for better coverage)
  for (let attempt = 0; attempt < 200; attempt++) {
    const left = padding + Math.floor(Math.random() * availableWidth);
    const top = padding + Math.floor(Math.random() * availableHeight);
    
    const newRect = {
      left: left,
      top: top,
      right: left + dimensions.width,
      bottom: top + dimensions.height
    };
    
    // Check if this position overlaps with any blocked position
    let overlaps = false;
    if (allBlockedPositions.length > 0) {
      for (const existingPos of allBlockedPositions) {
        if (doRectsOverlap(newRect, existingPos, MIN_SPACING)) {
          overlaps = true;
          break;
        }
      }
    }
    
    if (!overlaps) {
      // Add to used positions
      usedPositions.push({ left: left, top: top });
      // Keep only last 20 used positions
      if (usedPositions.length > 20) {
        usedPositions.shift();
      }
      return { left: left + 'px', top: top + 'px' };
    }
  }
  
  // If we can't find a non-overlapping position, try a grid-based approach
  // This is a fallback to ensure we always find a spot
  const gridCols = Math.max(2, Math.floor((sliderWidth - padding * 2) / (dimensions.width + MIN_SPACING)));
  const gridRows = Math.max(2, Math.floor((sliderHeight - padding * 2) / (dimensions.height + MIN_SPACING)));
  
  // Shuffle grid positions to add randomness
  const gridPositions = [];
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      gridPositions.push({ row, col });
    }
  }
  
  // Shuffle the grid positions
  for (let i = gridPositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [gridPositions[i], gridPositions[j]] = [gridPositions[j], gridPositions[i]];
  }
  
  // Try each shuffled grid position
  for (const { row, col } of gridPositions) {
    const left = padding + col * (dimensions.width + MIN_SPACING);
    const top = padding + row * (dimensions.height + MIN_SPACING);
    
    const newRect = {
      left: left,
      top: top,
      right: left + dimensions.width,
      bottom: top + dimensions.height
    };
    
    let overlaps = false;
    if (allBlockedPositions.length > 0) {
      for (const existingPos of allBlockedPositions) {
        if (doRectsOverlap(newRect, existingPos, MIN_SPACING)) {
          overlaps = true;
          break;
        }
      }
    }
    
    if (!overlaps) {
      // Add to used positions
      usedPositions.push({ left: left, top: top });
      if (usedPositions.length > 20) {
        usedPositions.shift();
      }
      return { left: left + 'px', top: top + 'px' };
    }
  }
  
  // Last resort: try a completely random position without overlap checking
  const lastResortLeft = padding + Math.floor(Math.random() * availableWidth);
  const lastResortTop = padding + Math.floor(Math.random() * availableHeight);
  usedPositions.push({ left: lastResortLeft, top: lastResortTop });
  if (usedPositions.length > 20) {
    usedPositions.shift();
  }
  return { left: lastResortLeft + 'px', top: lastResortTop + 'px' };
}

function showTestimonial(index) {
  if (!slides || slides.length === 0 || !slider) return;
  
  const slide = slides[index];
  if (!slide) return;
  
  // Hide first to remove from visible positions check
  slide.classList.remove('visible');
  
  // Clear old position
  const oldLeft = slide.style.left;
  const oldTop = slide.style.top;
  
  // Get a random position that doesn't overlap
  const position = getRandomPosition();
  
  // Store this position
  const leftVal = parseInt(position.left);
  const topVal = parseInt(position.top);
  
  // Set new random position BEFORE making visible
  slide.style.left = position.left;
  slide.style.top = position.top;
  
  // Force a reflow
  void slide.offsetWidth;
  
  // Small delay to ensure position is set, then make visible
  requestAnimationFrame(() => {
    slide.classList.add('visible');
  });
  
  // Hide after 7 seconds and clean up position tracking
  setTimeout(() => {
    slide.classList.remove('visible');
    // Remove this position from used positions after a delay
    setTimeout(() => {
      const idx = usedPositions.findIndex(p => p.left === leftVal && p.top === topVal);
      if (idx > -1) {
        usedPositions.splice(idx, 1);
      }
    }, 100);
  }, 7000);
}

// Wait for DOM to be ready and ensure layout is calculated
function initTestimonials() {
  if (!slides || slides.length === 0 || !slider) {
    setTimeout(initTestimonials, 100);
    return;
  }
  
  // Wait a bit more to ensure layout is fully calculated
  setTimeout(() => {
    // Start the cycle: first testimonial appears immediately
    showTestimonial(currentIndex);
    
    // Then show a new one every 7 seconds (slower pace to prevent overlap)
    setInterval(() => {
      currentIndex = (currentIndex + 1) % slides.length;
      showTestimonial(currentIndex);
    }, 7000);
  }, 300);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTestimonials);
} else {
  initTestimonials();
}

// Why Us Modal Functions
function openWhyUsModal() {
  const modal = document.getElementById('whyUsModal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }
}

function closeWhyUsModal(event) {
  const modal = document.getElementById('whyUsModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
  }
  if (event) {
    event.preventDefault();
  }
}

// Close modal on Escape key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeWhyUsModal();
  }
});