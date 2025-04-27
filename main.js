// Supabase configuration
const SUPABASE_URL = 'https://kbpubtadcwukqubwhmge.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticHVidGFkY3d1a3F1YndobWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1Mjc3NjcsImV4cCI6MjA1OTEwMzc2N30.0__aQKfomiltnoLLKUH_KhfK7IgtlZ0JezZBrvwNpRI';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const overlay = document.getElementById('overlay');
const monthYearText = document.getElementById('monthYear');
const datesContainer = document.getElementById('dates');
const selectedDateText = document.getElementById('selectedDateDisplay'); // Corrected ID
const eventModal = document.getElementById('eventModal');
const eventTitle = document.getElementById('eventTitle');
const eventDescription = document.getElementById('eventDescription');
const eventCategory = document.getElementById('eventCategory');
const saveEventBtn = document.getElementById('saveEvent');
const closeModal = document.getElementById('closeModal');
const eventList = document.getElementById('eventList');
const activeTab = document.getElementById('activeTab');
const completedTab = document.getElementById('completedTab');
const recurringCheckbox = document.getElementById('recurring');
const recurringOptionsDiv = document.getElementById('recurringOptions');
const createTaskButton = document.getElementById('createTaskButton');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

recurringCheckbox.addEventListener('change', () => {
  recurringOptionsDiv.style.display = recurringCheckbox.checked ? 'block' : 'none';
});

let currentDate = new Date();
let selectedDate = '';
let allEvents = [];
let showingCompleted = false;
let currentUser = '';
let calendarInitialized = false;

// Function to handle username submission
const btn = document.getElementById("button")

document.getElementById("form").addEventListener("submit", function (event) {
  event.preventDefault()

  btn.value = "Sending..."

  const serviceID = "default_service"
  const templateID = "template_cm9xuyc"
currentUser = email;
      form.classList.add('hidden');
      button.classList.add('hidden');
      fetchEvents().then(() => {
          renderCalendar(currentDate);
          calendarInitialized = true;})
  emailjs.sendForm(serviceID, templateID, this).then(
    () => {
      btn.value = "Send Email"
      alert("Sent!")
    },
    (err) => {
      btn.value = "Send Email"
      alert(JSON.stringify(err))
    },
  )

})
function renderEventList() {
  eventList.innerHTML = '';

  const filtered = allEvents.filter(e => (e.completed || false) === showingCompleted);

  filtered.forEach(e => {
      const item = document.createElement('div');
      item.classList.add('event-item');
      if (e.completed) {
          item.classList.add('completed');
      }

      // Format date
      const dueDate = new Date(e.due_date);
      const dateStr = dueDate.toLocaleDateString();

      // Build the HTML with new buttons
      item.innerHTML = `
          <strong>${e.title}</strong><br>
          Description: ${e.description || 'None'}<br>
          Category: ${e.category || 'Uncategorized'}<br>
          Date: ${dateStr}<br>
          <div class="event-buttons">
              <button class="edit-btn" data-task-id="${e.Task_ID}">Edit</button>
              <button class="complete-btn" data-task-id="${e.Task_ID}">${e.completed ? 'Uncomplete' : 'Complete'}</button>
              <button class="delete-btn" data-task-id="${e.Task_ID}">Delete</button>
          </div>
      `;

      // Event listener for the Complete button
      const completeButton = item.querySelector('.complete-btn');
      completeButton.addEventListener('click', async (event) => {
          event.stopPropagation();
          const taskIdToUpdate = event.target.dataset.taskId;
          const taskToUpdate = allEvents.find(task => task.Task_ID === taskIdToUpdate);
          if (taskToUpdate) {
              const updated = !taskToUpdate.completed;
              await db.from('Tasks').update({ completed: updated }).eq('Task_ID', taskIdToUpdate);
              taskToUpdate.completed = updated;
              renderEventList();
              renderCalendar(currentDate);
          }
      });

      // Event listener for the Delete button
      const deleteButton = item.querySelector('.delete-btn');
      deleteButton.addEventListener('click', async (event) => {
          event.stopPropagation();
          const taskIdToDelete = event.target.dataset.taskId;
          await deleteTask(taskIdToDelete);
      });

      // Event listener for the Edit button
      const editButton = item.querySelector('.edit-btn');
      editButton.addEventListener('click', async (event) => {
          event.stopPropagation();
          const taskIdToEdit = event.target.dataset.taskId;
          const taskToEdit = allEvents.find(task => task.Task_ID === taskIdToEdit);
          if (taskToEdit) {
              openModalForEdit(taskToEdit);
          }
      });

      eventList.appendChild(item);
  });
}

function openModal(date) {
  selectedDate = date;
  document.getElementById('selectedDate').textContent = `Selected Date: ${selectedDate}`; // Corrected ID
  eventTitle.value = '';
  eventDescription.value = '';
  eventCategory.value = '';
  recurringCheckbox.checked = false;
  recurringOptionsDiv.style.display = 'none';
  document.getElementById('modalTitle').textContent = 'Add Event';
  document.getElementById('saveEvent').textContent = 'Save Event';
  document.getElementById('deleteEvent').style.display = 'none';
  document.getElementById('deleteEvent').dataset.taskId = '';
  eventModal.style.display = 'block';
}

function openModalForEdit(task) {
  selectedDate = task.due_date;
  document.getElementById('selectedDate').textContent = `Selected Date: ${selectedDate}`; // Corrected ID
  eventTitle.value = task.title;
  eventDescription.value = task.description || '';
  eventCategory.value = task.category || '';
  recurringCheckbox.checked = task.recurring || false;
  recurringOptionsDiv.style.display = recurringCheckbox.checked ? 'block' : 'none';
  if (task.recurring) {
      document.getElementById('recurringPattern').value = task.recurring_pattern || 'weekly';
  }
  document.getElementById('modalTitle').textContent = 'Edit Task';
  document.getElementById('saveEvent').textContent = 'Save Changes';
  document.getElementById('deleteEvent').style.display = 'inline-block';
  document.getElementById('deleteEvent').dataset.taskId = task.Task_ID;
  eventModal.style.display = 'block';
}

closeModal.addEventListener('click', () => {
  eventModal.style.display = 'none';
});

function closeModalFunc() {
  eventModal.style.display = 'none';
  selectedDate = '';
}

saveEventBtn.removeEventListener('click', saveNewOrEditedEvent);
saveEventBtn.addEventListener('click', saveNewOrEditedEvent);

async function saveNewOrEditedEvent() {
  if (!currentUser) return;
  const isRecurring = recurringCheckbox.checked;
  const pattern = isRecurring ? document.getElementById('recurringPattern').value : null;

  const updatedTask = {
      title: eventTitle.value,
      description: eventDescription.value,
      category: eventCategory.value,
      due_date: selectedDate,
      recurring: isRecurring,
      recurring_pattern: pattern,
      completed: false,
      Username: currentUser // Ensure currentUser is used
  };

  const taskIdToUpdate = document.getElementById('deleteEvent').dataset.taskId;

  if (taskIdToUpdate) {
      const { error } = await db
          .from('Tasks')
          .update(updatedTask)
          .eq('Task_ID', taskIdToUpdate);

      if (error) {
          console.error('Update error:', error);
      } else {
          const index = allEvents.findIndex(task => task.Task_ID === taskIdToUpdate);
          if (index !== -1) {
              allEvents[index] = { ...allEvents[index], ...updatedTask };
          }
          renderEventList();
          renderCalendar(currentDate);
      }
      document.getElementById('modalTitle').textContent = 'Add Event';
      document.getElementById('saveEvent').textContent = 'Save Event';
      document.getElementById('deleteEvent').style.display = 'none';
      document.getElementById('deleteEvent').dataset.taskId = '';
  } else {
      const { data, error } = await db
          .from('Tasks')
          .insert([updatedTask])
          .select();

      if (error) {
          console.error('Insert error:', error);
      } else if (data && data.length > 0) {
          console.log('Event saved:', data);
          allEvents.push(data[0]);
          renderEventList();
          renderCalendar(currentDate);
      } else {
          console.warn('Insert succeeded but returned no data.');
      }
  }

  closeModalFunc();
}

async function deleteTask(taskId) {
  if (!currentUser) return;
  const { error } = await db
      .from('Tasks')
      .delete()
      .eq('Task_ID', taskId);

  if (error) {
      console.error('Delete error:', error);
  } else {
      console.log('Task deleted:', taskId);
      allEvents = allEvents.filter(event => event.Task_ID !== taskId);
      renderEventList();
      renderCalendar(currentDate);
  }
}

datesContainer.addEventListener('click', (event) => {
  if (event.target.classList.contains('date') && !event.target.classList.contains('inactive')) {
      selectedDate = event.target.dataset.date;
      document.getElementById('selectedDateDisplay').textContent = `Selected Date: ${selectedDate}`; // Corrected ID
      createTaskButton.style.display = 'block';
  }
});

createTaskButton.addEventListener('click', () => {
  console.log('Selected Date before opening modal:', selectedDate);
  openModal(selectedDate);
  createTaskButton.style.display = 'none';
});

let categoryColors = {};

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

async function fetchEvents() {
  if (!currentUser) return Promise.resolve();
  const { data, error } = await db.from('Tasks').select('*').eq('Username', currentUser);
  if (error) {
      console.error('Fetch error:', error);
  } else {
      allEvents = data.map(task => ({ ...task }));
      renderEventList();
      renderCalendar(currentDate);
  }
}

function renderCalendar(date) {
  if (!currentUser) {
      monthYearText.textContent = 'Please enter username';
      datesContainer.innerHTML = '';
      return;
  }
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayOfMonthDate = firstDayOfMonth.getDate();
  const lastDayOfMonthDate = lastDayOfMonth.getDate();

  monthYearText.textContent = `${date.toLocaleString('default', { month: 'long' })} ${year}`;
  datesContainer.innerHTML = '';

  const startDay = (firstDayOfMonth.getDay() + 6) % 7;
  for (let i = 0; i < startDay; i++) {
      datesContainer.appendChild(document.createElement('div'));
  }

  for (let i = 1; i <= lastDayOfMonthDate; i++) {
      const currentDateForLoop = new Date(year, month, i);
      const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dateDiv = document.createElement('div');
      dateDiv.classList.add('date');
      dateDiv.dataset.date = fullDate;
      dateDiv.textContent = i;
      dateDiv.style.backgroundColor = '';

      const activeEventsOnThisDate = allEvents.filter(event => {
          if (!event.completed) {
              if (event.due_date === fullDate) {
                  return true;
              }
              if (event.recurring && event.recurring_pattern === 'weekly') {
                  const eventDueDate = new Date(event.due_date);
                  const eventDayOfWeekUTC = eventDueDate.getUTCDay();
                  const currentDateForLoopUTC = new Date(currentDateForLoop.toISOString().slice(0, 10) + 'T00:00:00Z').getUTCDay();

                  if (eventDayOfWeekUTC === currentDateForLoopUTC) {
                      return currentDateForLoop >= eventDueDate && currentDateForLoop <= lastDayOfMonth;
                  }
              } else if (event.recurring && event.recurring_pattern === 'monthly') {
                  const eventDueDate = new Date(event.due_date);
                  return eventDueDate.getUTCDate() === currentDateForLoop.getUTCDate() &&
                         currentDateForLoop >= eventDueDate &&
                         currentDateForLoop <= lastDayOfMonth;
              }
          }
          return false;
      });

      if (activeEventsOnThisDate.length > 0) {
          const category = activeEventsOnThisDate[0].category || 'Uncategorized';
          if (!categoryColors[category]) {
              categoryColors[category] = getRandomColor();
          }
          dateDiv.style.backgroundColor = categoryColors[category];
          dateDiv.style.color = 'white';
      }

      datesContainer.appendChild(dateDiv);
  }
}

prevBtn.addEventListener('click', () => {
  if (currentUser) {
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendar(currentDate);
  }
});

nextBtn.addEventListener('click', () => {
  if (currentUser) {
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendar(currentDate);
  }
});

activeTab.addEventListener('click', () => {
  if (currentUser) {
      showingCompleted = false;
      activeTab.classList.add('active');
      completedTab.classList.remove('active');
      renderEventList();
  }
});

completedTab.addEventListener('click', () => {
  if (currentUser) {
      showingCompleted = true;
      completedTab.classList.add('active');
      activeTab.classList.remove('active');
      renderEventList();
  }
});

window.addEventListener('click', e => {
  if (e.target === eventModal) {
      closeModalFunc();
  }
});
