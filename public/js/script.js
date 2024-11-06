

//--------------------------- Select all carousel containers ---------------------------//

const carousels = document.querySelectorAll('.home-product-cards-wrapper');

// Loop through each carousel and set up functionality
carousels.forEach((carousel) => {
    // Select necessary elements from the DOM for this carousel
    const cardsContainer = carousel.querySelector('.home-product-cards');
    const cardItems = carousel.querySelectorAll('.card-items');
    const leftBtn = carousel.querySelector('.carousel-btn:nth-of-type(1)'); // Left button
    const rightBtn = carousel.querySelector('.carousel-btn:nth-of-type(2)'); // Right button

    // Initialize variables
    let currentIndex = 0;
    const cardsToShow = 5; // Number of visible cards at a time
    const totalCards = cardItems.length;

    // Function to calculate the width of the visible cards
    function calculateCardWidth() {
        const containerWidth = cardsContainer.offsetWidth;
        return containerWidth / cardsToShow; // Width for each card based on container
    }

    // Function to update button visibility based on current index
    function updateButtons() {
        leftBtn.style.display = currentIndex === 0 ? 'none' : 'block';
        rightBtn.style.display = currentIndex + cardsToShow >= totalCards ? 'none' : 'block';
    }

    // Function to slide cards based on the current index
    function slideCards() {
        const cardWidth = calculateCardWidth();
        const translateX = -currentIndex * cardWidth; // Calculate translation
        cardsContainer.style.transform = `translateX(${translateX}px)`; // Apply translation
        updateButtons(); // Update button visibility
    }

    // Event listener for the right button (next cards)
    rightBtn.addEventListener('click', () => {
        // Only move forward if we haven't reached the last set of cards
        if (currentIndex + cardsToShow < totalCards) {
            currentIndex++;
            slideCards(); // Slide cards forward
        }
    });

    // Event listener for the left button (previous cards)
    leftBtn.addEventListener('click', () => {
        // Only move backward if we're not at the first set of cards
        if (currentIndex > 0) {
            currentIndex--;
            slideCards(); // Slide cards backward
        }
    });

    // Initialize the carousel on page load
    updateButtons(); // Set initial button visibility
    slideCards(); // Slide to the starting position
});


//--------------------------- Select all carousel containers ---------------------------//

const togglePassButton = document.querySelector(".toggle-pass");

togglePassButton.addEventListener("click", () => {
  togglePassButton.classList.toggle("bx-hide");
  togglePassButton.classList.toggle("bx-show");
});


