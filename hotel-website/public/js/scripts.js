// JavaScript for slideshow
let slideIndex = 0;
showSlides();

function showSlides() {
    let slides = document.getElementsByClassName("slideshow")[0].children;
    for (let i = 0; i < slides.length; i++) {
        slides[i].classList.remove("active");
    }
    slideIndex++;
    if (slideIndex > slides.length) { slideIndex = 1 }
    slides[slideIndex-1].classList.add("active");
    setTimeout(showSlides, 2000); // Change image every 2 seconds
}

// JavaScript for room search
function searchRooms() {
    let input = document.getElementById('roomSearch').value.toLowerCase();
    let rooms = document.getElementsByClassName('room');
    
    for (let i = 0; i < rooms.length; i++) {
        let room = rooms[i];
        if (room.innerHTML.toLowerCase().indexOf(input) > -1) {
            room.style.display = "";
        } else {
            room.style.display = "none";
        }
    }
}

// JavaScript for loading room details
function loadRoomDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomName = urlParams.get('name');
    const roomTitle = document.getElementById('room-title');
    const roomImage = document.getElementById('room-image');
    const roomDescription = document.getElementById('room-description');
    const roomTypeInput = document.getElementById('roomType');



    document.addEventListener('DOMContentLoaded', () => {
        const roomType = document.getElementById('roomType').value;
    
        if (roomType === 'deluxe') {
            document.getElementById('room-title').innerText = 'Deluxe Room';
            document.getElementById('room-image').src = 'https://images.unsplash.com/photo-1568572933382-74d440642117';
            document.getElementById('room-description').innerText = 'The Deluxe Room offers comfortable and luxurious accommodations with modern amenities.';
        } else if (roomType === 'suite') {
            document.getElementById('room-title').innerText = 'Suite';
            document.getElementById('room-image').src = 'https://images.unsplash.com/photo-1519677100203-a0e668c92439';
            document.getElementById('room-description').innerText = 'The Suite provides a spacious and elegant environment with premium features.';
        }
        // Add more room types as needed
    });
    
    // Add more room types as needed
}

// Call loadRoomDetails if on the room.html page
if (window.location.pathname.endsWith('/room')) {
    loadRoomDetails();
}