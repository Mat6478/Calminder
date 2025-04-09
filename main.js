const monthYearElement = document.getElementById('monthYear');
const dateElement = document.getElementById('dates');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const eventModal = document.getElementById('eventModal');
const selectedDateElement = document.getElementById('selectedDate');
const eventListElement = document.getElementById('eventList');
const activeTab = document.getElementById('activeTab');
const completedTab = document.getElementById('completedTab');

let currentDate = new Date();
let selectedDate = null;
let events = JSON.parse(localStorage.getItem('events')) || {}; // Load events from localStorage
let currentTab = 'active'; // Track the current tab (either 'active' or 'completed')

// Update calendar
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
        let activeClass = '';
if (date.toDateString() === new Date().toDateString()) {
    activeClass = 'active'; // Highlight today's date
}
if (selectedDate && date.toISOString().split('T')[0] === selectedDate) {
    activeClass += ' selected'; // Highlight selected date if visible
}

        const hasEvent = events[formattedDate] && events[formattedDate].length > 0 ? 'has-event' : '';

        datesHTML += `<div class="date ${activeClass} ${hasEvent}" data-date="${formattedDate}">${i}</div>`;
    }

    for (let i = lastDayIndex; i < 6; i++) {
        datesHTML += `<div class="date inactive"></div>`;
    }

    dateElement.innerHTML = datesHTML;
};

// Save events to localStorage
const saveEvents = () => {
    localStorage.setItem('events', JSON.stringify(events));
};

// Handle date selection and display event modal
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('date') && !e.target.classList.contains('inactive')) {
        const previouslySelected = document.querySelector('.date.selected');
        if (previouslySelected) previouslySelected.classList.remove('selected');

        e.target.classList.add('selected');
        selectedDate = e.target.getAttribute('data-date');

        selectedDateElement.textContent = `Events for: ${selectedDate}`;
        const selectedDateDisplay = document.getElementById('selectedDateDisplay');
const readableDate = new Date(selectedDate).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
});
selectedDateDisplay.textContent = `Selected Date: ${readableDate}`;

        displayEvents();
        eventModal.style.display = 'block';
    }
});

// Save event (either new or edited)
document.getElementById('saveEvent').addEventListener('click', () => {
    const title = document.getElementById('eventTitle').value;
    const time = document.getElementById('eventTime').value;
    const description = document.getElementById('eventDescription').value;
    const category = document.getElementById('eventCategory').value;

    if (title && time) {
        const editIndex = document.getElementById('saveEvent').getAttribute('data-edit-index');

        if (editIndex) {
            // Editing an existing event
            events[selectedDate][editIndex] = {
                ...events[selectedDate][editIndex],
                title,
                time,
                description,
                category
            };
            document.getElementById('saveEvent').removeAttribute('data-edit-index');
        } else {
            // Adding a new event
            if (!events[selectedDate]) events[selectedDate] = [];
            events[selectedDate].push({ title, time, description, category, completed: false });
        }

        saveEvents();
        updateCalendar();
        displayEvents();
    } else {
        alert('Please enter both title and time.');
    }

    // Clear the form fields after saving
    document.getElementById('eventTitle').value = '';
    document.getElementById('eventTime').value = '';
    document.getElementById('eventDescription').value = '';
    document.getElementById('eventCategory').value = '';
});

// Display events for selected date
const displayEvents = () => {
    eventListElement.innerHTML = '';

    let eventsToDisplay = [];

    if (currentTab === 'active') {
        const eventsForDate = events[selectedDate] || [];
        eventsToDisplay = eventsForDate.map((event, index) => ({
            ...event,
            date: selectedDate,
            eventCategory,
            index
        })).filter(event => !event.completed);
    } else {
        // Show all completed events across all dates
        for (const [date, dateEvents] of Object.entries(events)) {
            dateEvents.forEach((event, index) => {
                if (event.completed) {
                    eventsToDisplay.push({
                        ...event,
                        date,
                        index
                    });
                }
            });
        }
    }

    if (eventsToDisplay.length === 0) {
        eventListElement.innerHTML = `<p>No ${currentTab} events found.</p>`;
        return;
    }

    eventsToDisplay.forEach((event) => {
        const eventItem = document.createElement('div');
        eventItem.classList.add('event-item');
        if (event.completed) eventItem.classList.add('completed');

        eventItem.innerHTML = `
    <div>
        <div>
            <input type="checkbox" class="completeEvent" data-index="${event.index}" data-date="${event.date}" ${event.completed ? 'checked' : ''}>
            <strong style="text-decoration: ${event.completed ? 'line-through' : 'none'}">
                ${event.time} - ${event.title}
            </strong>
        </div>
        <div style="text-decoration: ${event.completed ? 'line-through' : 'none'}">
            Description: ${event.description}
        </div>
        <div style="text-decoration: ${event.completed ? 'line-through' : 'none'}">
            Category: ${event.category}
        </div>
        <div>
            <small>${event.date}</small>
        </div>
    </div>
    <div style="text-align: right; margin-top: 5px;">
        <button class="editEvent" data-index="${event.index}" data-date="${event.date}" ${currentTab === 'completed' ? 'disabled' : ''}>Edit</button>
        <button class="deleteEvent" data-index="${event.index}" data-date="${event.date}">Delete</button>
    </div>
`;



        eventListElement.appendChild(eventItem);
    });


    document.querySelectorAll('.editEvent').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = e.target.getAttribute('data-index');
            const date = e.target.getAttribute('data-date');
            const event = events[date][index];

            selectedDate = date; // Update selectedDate context
            document.getElementById('eventTitle').value = event.title;
            document.getElementById('eventTime').value = event.time;
            document.getElementById('eventDescription').value = event.description;
            document.getElementById('eventCategory').value = event.category;

            document.getElementById('saveEvent').setAttribute('data-edit-index', index);
            eventModal.style.display = 'block';
        });
    });

    document.querySelectorAll('.deleteEvent').forEach(button => {
        button.addEventListener('click', (e) => {
            const index = e.target.getAttribute('data-index');
            const date = e.target.getAttribute('data-date');
            events[date].splice(index, 1);

            if (events[date].length === 0) delete events[date];

            saveEvents();
            updateCalendar();
            displayEvents();
        });
    });

    document.querySelectorAll('.completeEvent').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const index = e.target.getAttribute('data-index');
            const date = e.target.getAttribute('data-date');
            const event = events[date][index];

            event.completed = e.target.checked;

            saveEvents();
            updateCalendar();
            displayEvents(); // Refresh the view
        });
    });
};


// Close event modal
const closeModal = () => {
    eventModal.style.display = 'none';
};

document.getElementById('closeModal').addEventListener('click', closeModal);

// Navigate to previous month
prevBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateCalendar();
});

// Navigate to next month
nextBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateCalendar();
});

// Switch between active and completed tasks
activeTab.addEventListener('click', () => {
    currentTab = 'active';
    activeTab.classList.add('active');
    completedTab.classList.remove('active');
    displayEvents(); // Re-display events when switching tabs
});

completedTab.addEventListener('click', () => {
    currentTab = 'completed';
    completedTab.classList.add('active');
    activeTab.classList.remove('active');
    displayEvents(); // Re-display events when switching tabs
});

// Initialize calendar
updateCalendar();
displayEvents();
