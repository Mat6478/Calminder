
const monthYearElement = document.getElementById('monthYear');
const dateElement = document.getElementById('dates');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const eventModal = document.getElementById('eventModal');
const selectedDateElement = document.getElementById('selectedDate');
const eventListElement = document.getElementById('eventList');

let currentDate = new Date();
let selectedDate = null;
let events = JSON.parse(localStorage.getItem('events')) || {}; // Load events from localStorage

const updateCalendar = () => {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const totalDays = lastDay.getDate();
    const firstDayIndex = firstDay.getDay();
    const lastDayIndex = lastDay.getDay();

    const monthYearString = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    monthYearElement.textContent = monthYearString;

    let datesHTML = '';

    for (let i = 0; i < firstDayIndex; i++) {
        datesHTML += `<div class="date inactive"></div>`;
    }

    for (let i = 1; i <= totalDays; i++) {
        const date = new Date(currentYear, currentMonth, i);
        const formattedDate = date.toISOString().split('T')[0];
        const activeClass = date.toDateString() === new Date().toDateString() ? 'active' : '';
        const hasEvent = events[formattedDate] && events[formattedDate].length > 0 ? 'has-event' : '';

        datesHTML += `<div class="date ${activeClass} ${hasEvent}" data-date="${formattedDate}">${i}</div>`;
    }

    for (let i = lastDayIndex; i < 6; i++) {
        datesHTML += `<div class="date inactive"></div>`;
    }

    dateElement.innerHTML = datesHTML;
};

const saveEvents = () => {
    localStorage.setItem('events', JSON.stringify(events));
};

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('date') && !e.target.classList.contains('inactive')) {
        const previouslySelected = document.querySelector('.date.selected');
        if (previouslySelected) previouslySelected.classList.remove('selected');

        e.target.classList.add('selected');
        selectedDate = e.target.getAttribute('data-date');

        selectedDateElement.textContent = `Events for: ${selectedDate}`;
        displayEvents();
        eventModal.style.display = 'block';
    }
});

document.getElementById('saveEvent').addEventListener('click', () => {
    const title = document.getElementById('eventTitle').value;
    const time = document.getElementById('eventTime').value;
    const description = document.getElementById('eventDescription').value;

    if (title && time) {
        if (!events[selectedDate]) events[selectedDate] = []; // Initialize array if not present
        events[selectedDate].push({ title, time, description });
        saveEvents();
        updateCalendar();
        displayEvents();

        document.getElementById('eventTitle').value = '';
        document.getElementById('eventTime').value = '';
        document.getElementById('eventDescription').value = '';
    } else {
        alert('Please enter both title and time for the event.');
    }
});

const displayEvents = () => {
    const eventsForDate = events[selectedDate] || [];
    eventListElement.innerHTML = '';

    if (eventsForDate.length === 0) {
        eventListElement.innerHTML = '<p>No events for this day.</p>';
        return;
    }

    eventsForDate.forEach((event, index) => {
        const eventItem = document.createElement('div');
        eventItem.classList.add('event-item');
        eventItem.innerHTML = `
            <strong>${event.time} - ${event.title}</strong><br>
            ${event.description} 
            <button class= "editEvent" data-index="${index}"Edit</button>
            <button class="deleteEvent" data-index="${index}">Delete</button> 
        `; // delete button doesnt work
        eventListElement.appendChild(eventItem);
    });
};

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('editEvent')) {
        const index = e.target.getAttribute('data-index');
        const eventsForDate = events[selectedDate] || [];
        const eventToEdit = eventsForDate[index];

        // Populate the form with existing event data
        document.getElementById('eventTitle').value = eventToEdit.title;
        document.getElementById('eventTime').value = eventToEdit.time;
        document.getElementById('eventDescription').value = eventToEdit.description;

        // Store the index being edited
        document.getElementById('saveEvent').setAttribute('data-edit-index', index);
        eventModal.style.display = 'block';
    }
});

document.getElementById('saveEvent').addEventListener('click', () => {
    const title = document.getElementById('eventTitle').value;
    const time = document.getElementById('eventTime').value;
    const description = document.getElementById('eventDescription').value;
    const editIndex = document.getElementById('saveEvent').getAttribute('data-edit-index');

    if (title && time) {
        if (editIndex !== null) {  // Editing an existing event
            events[selectedDate][editIndex] = { title, time, description };
            document.getElementById('saveEvent').removeAttribute('data-edit-index');  // Clear edit index
        } else {  // Adding a new event
            if (!events[selectedDate]) events[selectedDate] = [];
            events[selectedDate].push({ title, time, description });
        }

        updateCalendar();
        displayEvents();
        eventModal.style.display = 'none';

        // Clear form
        document.getElementById('eventTitle').value = '';
        document.getElementById('eventTime').value = '';
        document.getElementById('eventDescription').value = '';
    } else {
        alert('Please enter both title and time for the event.');
    }
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('date') && !e.target.classList.contains('inactive')) {
        const previouslySelected = document.querySelector('.date.selected');
        if (previouslySelected) previouslySelected.classList.remove('selected');

        e.target.classList.add('selected');
        selectedDate = e.target.getAttribute('data-date');

        selectedDateElement.textContent = `Events for: ${selectedDate}`;
        displayEvents();  // Display events for the selected date
        eventModal.style.display = 'block';
    }
});

//personal reminders

//task view ability to edit existing tasks

//ability to mark tasks as completed

// ability to set up personal reminders



document.getElementById('closeModal').addEventListener('click', () => {
    eventModal.style.display = 'none';
});

prevBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateCalendar();
});

nextBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateCalendar();
});

updateCalendar();
