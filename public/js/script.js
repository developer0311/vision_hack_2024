

//--------------------------- Select all carousel containers ---------------------------//

const carousels = document.querySelectorAll('.home-product-cards-wrapper');

carousels.forEach((carousel) => {
    const cardsContainer = carousel.querySelector('.home-product-cards');
    const cardItems = carousel.querySelectorAll('.card-items');
    const leftBtn = carousel.querySelector('.carousel-btn:nth-of-type(1)');
    const rightBtn = carousel.querySelector('.carousel-btn:nth-of-type(2)');

    let currentIndex = 0;
    let cardsToShow;
    const totalCards = cardItems.length;

    // Set number of cards to show based on screen size
    function setCardsToShow() {
        if (window.innerWidth <= 768) {
            cardsToShow = 3; // Show 3 cards on mobile
        } else {
            cardsToShow = 5; // Show 5 cards on larger screens
        }
        slideCards(); // Adjust the carousel display
    }

    // Calculate width of each card
    function calculateCardWidth() {
        const containerWidth = cardsContainer.offsetWidth;
        return containerWidth / cardsToShow;
    }

    // Update button visibility based on current index
    function updateButtons() {
        leftBtn.style.display = currentIndex === 0 ? 'none' : 'block';
        rightBtn.style.display = currentIndex + cardsToShow >= totalCards ? 'none' : 'block';
    }

    // Slide cards based on current index
    function slideCards() {
        const cardWidth = calculateCardWidth();
        const translateX = -currentIndex * cardWidth;
        cardsContainer.style.transform = `translateX(${translateX}px)`;
        updateButtons();
    }

    // Right button event listener
    rightBtn.addEventListener('click', () => {
        if (currentIndex + cardsToShow < totalCards) {
            currentIndex++;
            slideCards();
        }
    });

    // Left button event listener
    leftBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            slideCards();
        }
    });

    // Adjust cards to show based on screen size on load and resize
    window.addEventListener('resize', setCardsToShow);
    setCardsToShow(); // Initialize cards to show
});




//--------------------------- Select all carousel containers ---------------------------//

const togglePassButton = document.querySelector(".toggle-pass");

togglePassButton.addEventListener("click", () => {
  togglePassButton.classList.toggle("bx-hide");
  togglePassButton.classList.toggle("bx-show");
});


