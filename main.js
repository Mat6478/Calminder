
// Supabase configuration
const SUPABASE_URL = 'https://kbpubtadcwukqubwhmge.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticHVidGFkY3d1a3F1YndobWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1Mjc3NjcsImV4cCI6MjA1OTEwMzc2N30.0__aQKfomiltnoLLKUH_KhfK7IgtlZ0JezZBrvwNpRI';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const monthYearText = document.getElementById('monthYear');
const datesContainer = document.getElementById('dates');
const selectedDateText = document.getElementById('selectedDate');
const selectedDateDisplay = document.getElementById('selectedDateDisplay');
const eventModal = document.getElementById('eventModal');
const eventTitle = document.getElementById('eventTitle');
const eventTime = document.getElementById('eventTime');
const eventDescription = document.getElementById('eventDescription');
const eventCategory = document.getElementById('eventCategory');
const saveEventBtn = document.getElementById('saveEvent');
const closeModal = document.getElementById('closeModal');
const eventList = document.getElementById('eventList');
const activeTab = document.getElementById('activeTab');
const completedTab = document.getElementById('completedTab');

let currentDate = new Date();
let selectedDate = '';
let allEvents = [];
let showingCompleted = false;
let currentUser = 'demo_user'; // Replace with actual logged-in username if needed

function renderCalendar(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  monthYearText.textContent = `${date.toLocaleString('default', {
    month: 'long'
  })} ${year}`;

  datesContainer.innerHTML = '';

  const start = (firstDay + 6) % 7;
  for (let i = 0; i < start; i++) {
    const empty = document.createElement('div');
    datesContainer.appendChild(empty);
  }

  for (let i = 1; i <= lastDate; i++) {
    const dateDiv = document.createElement('div');
    dateDiv.classList.add('date');
    const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    dateDiv.dataset.date = fullDate;
    dateDiv.textContent = i;
    dateDiv.addEventListener('click', () => openModal(fullDate));
    datesContainer.appendChild(dateDiv);
  }
}

function openModal(date) {
  selectedDate = date;
  selectedDateText.textContent = `Selected Date: ${date}`;
  selectedDateDisplay.textContent = `Selected Date: ${date}`;
  eventTitle.value = '';
  eventTime.value = '';
  eventDescription.value = '';
  eventCategory.value = '';
  eventModal.style.display = 'block';
}

function closeModalFunc() {
  eventModal.style.display = 'none';
}

closeModal.addEventListener('click', closeModalFunc);

saveEventBtn.addEventListener('click', async () => {
  const newEvent = {
    title: eventTitle.value,
    description: eventDescription.value,
    category: eventCategory.value,
    due_date: selectedDate,
    completed: false,
    Username: currentUser
  };

  const { data, error } = await db
    .from('Tasks')
    .insert([newEvent])
    .select(); 

  if (error) {
    console.error('Insert error:', error);
  } else if (data && data.length > 0) {
    console.log('Event saved:', data);
    allEvents.push(data[0]);
    renderEventList();
  } else {
    console.warn('Insert succeeded but returned no data.');
  }

  closeModalFunc();
});


function renderEventList() {
  eventList.innerHTML = '';
  const filtered = allEvents.filter(e => (e.completed || false) === showingCompleted);
  filtered.forEach(e => {
    const item = document.createElement('div');
    item.classList.add('event-item');
    item.innerHTML = `<strong>${e.title}</strong> (${e.due_date})<br>${e.description || ''}`;
    item.addEventListener('click', async () => {
      const updated = !e.completed;
      await db.from('Tasks').update({ completed: updated }).eq('Task_ID', e.Task_ID);
      e.completed = updated;
      renderEventList();
    });
    eventList.appendChild(item);
  });
}

async function fetchEvents() {
  const { data, error } = await db.from('Tasks').select('*').eq('Username', currentUser);
  if (error) {
    console.error('Fetch error:', error);
  } else {
    allEvents = data.map(task => ({
      Task_ID: task.Task_ID,
      title: task.title,
      description: task.description,
      category: task.category,
      due_date: task.due_date,
      completed: task.completed,
      Username: task.Username
    }));
    renderEventList();
  }
}

document.getElementById('prevBtn').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar(currentDate);
});

document.getElementById('nextBtn').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar(currentDate);
});

activeTab.addEventListener('click', () => {
  showingCompleted = false;
  activeTab.classList.add('active');
  completedTab.classList.remove('active');
  renderEventList();
});

completedTab.addEventListener('click', () => {
  showingCompleted = true;
  completedTab.classList.add('active');
  activeTab.classList.remove('active');
  renderEventList();
});

window.addEventListener('click', e => {
  if (e.target === eventModal) {
    closeModalFunc();
  }
});

renderCalendar(currentDate);
fetchEvents();
