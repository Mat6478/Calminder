// Supabase configuration
const SUPABASE_URL = 'https://kbpubtadcwukqubwhmge.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticHVidGFkY3d1a3F1YndobWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1Mjc3NjcsImV4cCI6MjA1OTEwMzc2N30.0__aQKfomiltnoLLKUH_KhfK7IgtlZ0JezZBrvwNpRI';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Ask for browser notification permission when page loads
if ('Notification' in window && Notification.permission !== 'granted') {
    Notification.requestPermission();
}

const usernamePrompt = document.getElementById('usernamePrompt');
const usernameInput = document.getElementById('usernameInput');
const loginScreen = document.getElementById('loginScreen');
const loginUsername = document.getElementById('loginUsername');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginButton = document.getElementById('loginButton');
const loginError = document.getElementById('loginError');

const usernameSubmit = document.getElementById('usernameSubmit');
const overlay = document.getElementById('overlay');
const monthYearText = document.getElementById('monthYear');
const datesContainer = document.getElementById('dates');
const selectedDateText = document.getElementById('selectedDateDisplay'); // Corrected ID
const eventModal = document.getElementById('eventModal');
const eventTitle = document.getElementById('eventTitle');
const eventDescription = document.getElementById('eventDescription');
const eventCategory = document.getElementById('eventCategory');
//const reminderTimeInput = document.getElementById('reminderTime');
const customReminderCheck = document.getElementById('customReminderCheck');
const customReminderTime = document.getElementById('customReminderTime');
customReminderCheck.addEventListener('change', () => {
  customReminderTime.disabled = !customReminderCheck.checked;
});
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
let allScheduleBlocks = [];
let showingCompleted = false;
let currentUser = '';
let calendarInitialized = false;

// Function to handle Username submission
loginButton.addEventListener('click', async () => {
    const Username = loginUsername.value.trim().replaceAll(':', '');
    const password = loginPassword.value.trim();
    const email = loginEmail.value.trim();

    console.log({
        Username: Username,
        email: email,
        password: password
      });
      
    if (!Username || !password) {
        loginError.textContent = 'Please enter both Username and password.';
        return;
    }

    const { data: existingUser, error: selectError } = await db
    .from('Users')
    .select('*')
    .eq('Username', Username)
    .maybeSingle(); // <-- CHANGES HERE
  

      if (selectError) {
          console.error('Error checking for existing user:', selectError);
          alert('An error occurred while checking the username.');
          return;
      }

    if (existingUser) {
        if (existingUser.password && existingUser.password === password) {
            console.log('Login successful!');
            currentUser = Username;
            loginScreen.style.display = 'none';
            overlay.style.display = 'none';
            Promise.all([fetchEvents(), fetchScheduleBlocks()]).then(() => {
                renderCalendar(currentDate);
                calendarInitialized = true;
            });
        } else {
            loginError.textContent = 'Incorrect password.';
        }
    } else {
        if (!email) {
            loginError.textContent = 'Please enter an email to sign up.';
            return;
        }

        const { data: insertData, error: insertError } = await db
        .from('Users')
        .insert([
          {
            Username: Username,
            email: email,
            password: password
          }
        ])
        .select();  // <- important!
      


        if (insertError) {
            console.error('Error creating user:', insertError);
            loginError.textContent = 'Could not create account. Try again.';
        } else {
            console.log('New account created!');
            currentUser = Username;
            loginScreen.style.display = 'none';
            overlay.style.display = 'none';
            Promise.all([fetchEvents(), fetchScheduleBlocks()]).then(() => {
                renderCalendar(currentDate);
                calendarInitialized = true;
            });
        }
    }
});


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

        // Build the HTML
        item.innerHTML = `
            <strong>${e.title || 'Unnamed'}</strong><br>
            <div class="event-details">
                <p class="event-description">Description: ${e.description || 'None'}</p>
                <p class="event-category">Category: ${e.category || 'Uncategorized'}</p>
                <p class="event-date">Date: ${dateStr}</p>
            </div>
            <div class="event-buttons">
                <button class="edit-btn" data-task-id="${e.Task_ID}">Edit</button>
                <button class="complete-btn" data-task-id="${e.Task_ID}">${e.completed ? 'Uncomplete' : 'Complete'}</button>
                <button class="more-info-btn" data-task-id="${e.Task_ID}">More Info</button>
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
            if (updated === true) updateStreakOnTaskComplete();
            taskToUpdate.completed = updated;
            renderEventList();
            renderCalendar(currentDate);
        }
    });

      // Event listener for the Edit button
      const editButton = item.querySelector('.edit-btn');
        editButton.addEventListener('click', (event) => {
            event.stopPropagation();
            const taskIdToEdit = event.target.dataset.taskId;
            showTaskDetails(taskIdToEdit, true); // Pass true to enable edit mode
        });

        // (New) Event listener for the "More Info" button
        const moreInfoButton = item.querySelector('.more-info-btn');
        moreInfoButton.addEventListener('click', (event) => {
            event.stopPropagation();
            const taskId = event.target.dataset.taskId;
            showTaskDetails(taskId, false); // Pass false for view-only mode
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
    document.getElementById('deleteEvent').style.display = 'none'; // Ensure delete button is hidden in create mode
    document.getElementById('deleteEvent').dataset.taskId = '';
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

  // Collect selected preset reminders
const reminderOptions = [...document.querySelectorAll('input[name="reminder"]:checked')].map(input => parseInt(input.value));

// Handle custom reminder
const reminders = reminderOptions.map(daysBefore => {
  const reminderDate = new Date(selectedDate);
  reminderDate.setDate(reminderDate.getDate() - daysBefore);
  return reminderDate.toISOString();
});

if (customReminderCheck.checked && customReminderTime.value) {
  reminders.push(new Date(customReminderTime.value).toISOString());
}

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
          const insertedTaskId = data[0].Task_ID;
          const reminderRows = reminders.map(time => ({
          Task_ID: insertedTaskId,
          reminder_time: time
}));
await db.from('Reminders').insert(reminderRows);

      } else {
          console.warn('Insert succeeded but returned no data.');
      }
  }

  closeModalFunc();
}

async function deleteTask(taskId) {
    if (!currentUser || !taskId) return;

    // First, get the file URL associated with the task (if any)
    const { data: taskData, error: fetchError } = await db
        .from('Tasks')
        .select('file_url')
        .eq('Task_ID', taskId)
        .single();

    if (fetchError) {
        console.error('Error fetching task file URL:', fetchError);
        alert('Error deleting task.');
        return;
    }

    // Delete the task from the database
    const { error: deleteError } = await db
        .from('Tasks')
        .delete()
        .eq('Task_ID', taskId);

    if (deleteError) {
        console.error('Delete error:', deleteError);
        alert('Failed to delete task.');
    } else {
        console.log('Task deleted:', taskId);
        // Remove the task from the allEvents array
        allEvents = allEvents.filter(task => task.Task_ID !== taskId);
        renderEventList();
        renderCalendar(currentDate);
        taskDetailsContent.innerHTML = '';
        taskDetailsSection.style.display = 'none';

        
        if (taskData && taskData.file_url) {
            const bucketName = 'files'; 
            const filePathToDelete = taskData.file_url.split(`${SUPABASE_URL}/storage/v1/object/public/${bucketName}/`)[1];

            if (filePathToDelete) {
                const { error: storageError } = await db
                    .storage
                    .from(bucketName)
                    .remove([filePathToDelete]); 
                if (storageError) {
                    console.error('Error deleting file from storage:', storageError);
                    alert('Task deleted, but failed to delete associated file.');
                } else {
                    console.log('Associated file deleted:', filePathToDelete);
                }
            }
        }
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
  async function fetchScheduleBlocks() {
    if (!currentUser) return Promise.resolve();

    const { data, error } = await db.from('schedule_blocks').select('*').eq('Username', currentUser);

    if (error) {
        console.error('Fetch schedule blocks error:', error);
    } else {
        allScheduleBlocks = data || [];
        console.log('Fetched schedule blocks:', allScheduleBlocks);
        renderScheduleBlocksList(); 
    }
}


async function deleteBlock(blockId) {
    try {
        const { data, error } = await db
            .from('schedule_blocks')
            .delete()
            .eq('Block_id', blockId);

        if (error) {
            console.error('Error deleting block:', error);
        } else {
            console.log('Block deleted successfully');
            // Refresh the page or re-fetch the blocks
            fetchScheduleBlocks();
        }
    } catch (error) {
        console.error('Unexpected error deleting block:', error);
    }
}

async function editBlock(block) {
    const newTitle = prompt('Enter new title:', block.Title);
    if (!newTitle) return;

    const { error } = await db
        .from('schedule_blocks')
        .update({ Title: newTitle })
        .eq('Block_id', block.Block_id);

    if (error) {
        console.error('Error updating block:', error);
        alert('Failed to update block.');
    } else {
        console.log('Block updated successfully');
        await fetchScheduleBlocks();
        renderCalendar(currentDate);
    }
}



async function checkReminders() {
    if (!currentUser) return;

    const now = new Date();
    const oneMinuteLater = new Date(now.getTime() + 60000).toISOString();

    // Get reminders due in the next minute for the current user
    const { data: reminders, error } = await db
        .from('Reminders')
        .select('reminder_time, task_ID, Tasks(title, description)')
        .lte('reminder_time', oneMinuteLater);

    if (error) {
        console.error('Error fetching reminders:', error);
        return;
    }

    if (!reminders || reminders.length === 0) return;

    for (const reminder of reminders) {
        const task = reminder.Tasks;
        if (!task) continue;

        new Notification(`Reminder: ${task.title}`, {
            body: task.description || 'You have a task coming up!',
        });

        // Delete the reminder after it's shown
        await db.from('Reminders')
            .delete()
            .eq('Task_ID', reminder.Task_ID)
            .eq('reminder_time', reminder.reminder_time);
    }
}

function renderCalendar(date) {
    if (!currentUser) return;

    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDay = (firstDayOfMonth.getDay() + 6) % 7;

    monthYearText.textContent = `${date.toLocaleString('default', { month: 'long' })} ${year}`;
    datesContainer.innerHTML = '';

    for (let i = 0; i < startDay; i++) {
        datesContainer.appendChild(document.createElement('div'));
    }

    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
        const currentDateForLoop = new Date(year, month, i);
        const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

        const dateDiv = document.createElement('div');
        dateDiv.classList.add('date');
        dateDiv.dataset.date = fullDate;
        dateDiv.textContent = i;

        dateDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedDate = fullDate;
            document.getElementById('selectedDateDisplay').textContent = `Selected Date: ${selectedDate}`;
            createTaskButton.style.display = 'block';
        });

        datesContainer.appendChild(dateDiv);
    }
}

  
  function openEditScheduleBlockModal(block) {
    document.getElementById('scheduleBlockModal').style.display = 'flex';
    document.getElementById('blockTitle').value = block.Title;
    document.getElementById('startTime').value = block.Start_time.slice(0, 5);
    document.getElementById('endTime').value = block.End_time.slice(0, 5);

   
    document.querySelectorAll('input[name="days"]').forEach(cb => cb.checked = false);
    block.Days.forEach(day => {
        const cb = document.querySelector(`input[name="days"][value="${day}"]`);
        if (cb) cb.checked = true;
    });

    document.getElementById('scheduleBlockModal').dataset.editingBlockId = block.Block_id;
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

const taskDetailsSection = document.getElementById('taskDetailsSection');
const taskDetailsContent = document.getElementById('taskDetailsContent');


function showTaskDetails(taskId, isEditMode = false) {
    const task = allEvents.find(event => event.Task_ID === taskId);
    if (task) {
        let detailsContent = '';

        const options = [
            { label: 'Description', property: 'description', className: 'event-description', defaultVisible: true },
            { label: 'Category', property: 'category', className: 'event-category', defaultVisible: true },
            { label: 'Date', property: 'due_date', className: 'event-date', defaultVisible: true },
            { label: 'File', property: 'file', className: 'event-file', defaultVisible: false }, // New option for file
        ];

        const checklistHTML = `
            <div class="display-options-container">
                <button id="display-options-btn-${taskId}">Display Options</button>
                <div id="display-options-checklist-${taskId}" class="display-options-checklist" style="display: none; position: absolute; background-color: #fff; border: 1px solid #ccc; padding: 10px; border-radius: 5px; z-index: 10;">
                    ${options.map(option => `
                        <label style="display: block;">
                            <input type="checkbox" id="display-${option.property}-${taskId}" data-property="${option.property}" data-task-id="${taskId}" ${localStorage.getItem(`display-${option.property}`) !== 'false' ? 'checked' : ''}>
                            ${option.label}
                        </label>
                    `).join('')}
                </div>
            </div>
        `;

        if (isEditMode) {
            detailsContent = `
                <h3>Edit Task</h3>
                ${checklistHTML}
                <label for="edit-title">Title:</label>
                <input type="text" id="edit-title" value="${task.title || ''}"><br><br>
                <label for="edit-description">Description:</label>
                <textarea id="edit-description">${task.description || ''}</textarea><br><br>
                <label for="edit-category">Category:</label>
                <input type="text" id="edit-category" value="${task.category || ''}"><br><br>
                <label for="edit-due-date">Due Date:</label>
                <input type="date" id="edit-due-date" value="${task.due_date}"><br><br>
                <label for="edit-recurring">Recurring:</label>
                <input type="checkbox" id="edit-recurring" ${task.recurring ? 'checked' : ''}><br>
                <div id="edit-recurring-options" style="display: ${task.recurring ? 'block' : 'none'}; margin-left: 20px;">
                    <label for="edit-recurring-pattern">Repeat:</label>
                    <select id="edit-recurring-pattern">
                        <option value="weekly" ${task.recurring_pattern === 'weekly' ? 'selected' : ''}>Weekly</option>
                        <option value="monthly" ${task.recurring_pattern === 'monthly' ? 'selected' : ''}>Monthly</option>
                    </select>
                </div><br>
                <label for="upload-file">Upload File:</label>
                <input type="file" id="upload-file" data-task-id="${task.Task_ID}"><br><br>
                <button id="save-changes-btn" data-task-id="${task.Task_ID}">Save Changes</button>
                <button id="delete-task-btn" data-task-id="${task.Task_ID}">Delete Task</button>
            `;
        } else {
            let fileDisplayHTML = '';
            if (task.file_url && task.file_name) {
                const fileExtension = task.file_name.split('.').pop().toLowerCase();
                const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];

                if (imageExtensions.includes(fileExtension)) {
                    fileDisplayHTML = `
                        <strong>Attached Image:</strong><br>
                        <img src="${task.file_url}" alt="${task.file_name}" style="max-width: 100%; height: auto;">
                    `;
                } else {
                    fileDisplayHTML = `
                        <strong>Attached File:</strong> <a href="${task.file_url}" target="_blank" rel="noopener noreferrer" id="download-file-${task.Task_ID}">Download ${task.file_name}</a>
                    `;
                }
            } else {
                fileDisplayHTML = '<strong>Attached File:</strong> No file uploaded';
            }

            detailsContent = `
                <h3>${task.title || 'Unnamed'}</h3>
                ${checklistHTML}
                <p class="event-description" style="display: ${localStorage.getItem('display-description') !== 'false' ? 'block' : 'none'};"><strong>Description:</strong> ${task.description || 'None'}</p>
                <p class="event-category" style="display: ${localStorage.getItem('display-category') !== 'false' ? 'block' : 'none'};"><strong>Category:</strong> ${task.category || 'Uncategorized'}</p>
                <p class="event-date" style="display: ${localStorage.getItem('display-date') !== 'false' ? 'block' : 'none'};"><strong>Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
                <div id="file-display-${task.Task_ID}" class="event-file" style="display: ${localStorage.getItem('display-file') !== 'false' ? 'block' : 'none'};">
                    ${fileDisplayHTML}
                </div>
                ${task.recurring ? `<p><strong>Recurring:</strong> Yes (${task.recurring_pattern})</p>` : ''}
                <button id="edit-task-btn" data-task-id="${task.Task_ID}">Edit</button>
            `;
        }
        

        taskDetailsContent.innerHTML = detailsContent;
        taskDetailsSection.style.display = 'block';

        // Add event listener for the "Display Options" button
        const displayOptionsButton = document.getElementById(`display-options-btn-${taskId}`);
        const displayOptionsChecklist = document.getElementById(`display-options-checklist-${taskId}`);

        if (displayOptionsButton && displayOptionsChecklist) {
            displayOptionsButton.addEventListener('click', (event) => {
                displayOptionsChecklist.style.display = displayOptionsChecklist.style.display === 'none' ? 'block' : 'none';
                // Close other open checklists if needed
            });

            // Event listeners for the checkboxes in the checklist
            options.forEach(option => {
                const checkbox = document.getElementById(`display-${option.property}-${taskId}`);
                if (checkbox) {
                    checkbox.addEventListener('change', (event) => {
                        const property = event.target.dataset.property;
                        const taskId = event.target.dataset.taskId;
                        const elementsToToggle = taskDetailsContent.querySelectorAll(`.${option.className}`);
                        elementsToToggle.forEach(el => {
                            el.style.display = event.target.checked ? 'block' : 'none';
                        });
                        localStorage.setItem(`display-${property}`, event.target.checked);
                    });
                }
            });
        }


        // Add event listeners for the main action buttons *after* setting innerHTML
        if (isEditMode) {
            const saveChangesButton = document.getElementById('save-changes-btn');
            if (saveChangesButton) {
                saveChangesButton.addEventListener('click', (event) => {
                    const taskIdToUpdate = event.target.dataset.taskId;
                    saveTaskChanges(taskIdToUpdate);
                });
            }

            const deleteTaskButton = document.getElementById('delete-task-btn');
            if (deleteTaskButton) {
                deleteTaskButton.addEventListener('click', (event) => {
                    const taskIdToDelete = event.target.dataset.taskId;
                    deleteTask(taskIdToDelete);
                    taskDetailsContent.innerHTML = '';
                    taskDetailsSection.style.display = 'none';
                });
            }

            // Add event listener for the file upload input
            const fileInput = document.getElementById('upload-file');
            if (fileInput) {
                fileInput.addEventListener('change', (event) => {
                    const taskId = event.target.dataset.taskId;
                    const file = event.target.files[0];
                    if (file) {
                        uploadFile(taskId, file);
                    }
                });
            }
        } else {
            const editButtonInView = document.getElementById('edit-task-btn');
            if (editButtonInView) {
                editButtonInView.addEventListener('click', (event) => {
                    const taskIdToEdit = event.target.dataset.taskId;
                    showTaskDetails(taskIdToEdit, true);
                });
            }
        }

        // Close the checklist when clicking outside
        setTimeout(() => {
            document.addEventListener('click', (event) => {
                const displayOptionsChecklist = document.getElementById(`display-options-checklist-${taskId}`);
                const displayOptionsButton = document.getElementById(`display-options-btn-${taskId}`);
                if (displayOptionsChecklist && displayOptionsChecklist.style.display === 'block' && displayOptionsButton && !displayOptionsButton.contains(event.target) && !displayOptionsChecklist.contains(event.target)) {
                    displayOptionsChecklist.style.display = 'none';
                }
            });
        }, 0);

    } else {
        taskDetailsContent.innerHTML = '<p>Task details not found.</p>';
        taskDetailsSection.style.display = 'block';
    }
}

async function saveTaskChanges(taskId) {
    if (!currentUser || !taskId) return;

    const updatedTask = {
        title: document.getElementById('edit-title').value,
        description: document.getElementById('edit-description').value,
        category: document.getElementById('edit-category').value,
        due_date: document.getElementById('edit-due-date').value,
        recurring: document.getElementById('edit-recurring').checked,
        recurring_pattern: document.getElementById('edit-recurring').checked
            ? document.getElementById('edit-recurring-pattern').value
            : null,
        Username: currentUser
    };

    const { error } = await db
        .from('Tasks')
        .update(updatedTask)
        .eq('Task_ID', taskId);

    if (error) {
        console.error('Update error:', error);
        alert('Failed to save changes.');
    } else {
        console.log('Task updated:', taskId, updatedTask);
        // Update the task in the allEvents array
        const index = allEvents.findIndex(task => task.Task_ID === taskId);
        if (index !== -1) {
            allEvents[index] = { ...allEvents[index], ...updatedTask };
        }
        renderEventList();
        renderCalendar(currentDate);

        // Instead of clearing and hiding, show the view-only version
        showTaskDetails(taskId, false);
    }
}

let currentDisplayOptionsChecklist = null; // To manage and close existing checklists

function showDisplayOptions(taskId, buttonElement) {
    const task = allEvents.find(event => event.Task_ID === taskId);
    if (!task) return;

    // Close any existing checklist
    if (currentDisplayOptionsChecklist) {
        currentDisplayOptionsChecklist.remove();
        currentDisplayOptionsChecklist = null;
        return;
    }

    const checklistContainer = document.createElement('div');
    checklistContainer.classList.add('display-options-checklist');
    checklistContainer.style.position = 'absolute';
    checklistContainer.style.left = buttonElement.offsetLeft + 'px';
    checklistContainer.style.top = (buttonElement.offsetTop + buttonElement.offsetHeight) + 'px';
    checklistContainer.style.backgroundColor = '#fff';
    checklistContainer.style.border = '1px solid #ccc';
    checklistContainer.style.padding = '10px';
    checklistContainer.style.borderRadius = '5px';
    checklistContainer.style.zIndex = '10'; // Ensure it's above other elements

    const options = [
        { label: 'Description', property: 'description', className: 'event-description', defaultVisible: true },
        { label: 'Category', property: 'category', className: 'event-category', defaultVisible: true },
        { label: 'Date', property: 'due_date', className: 'event-date', defaultVisible: true },
        // Add more options here as you implement them (e.g., Files, Images, Hyperlinks)
    ];


    options.forEach(option => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `display-${option.property}-${taskId}`;
        checkbox.checked = localStorage.getItem(`display-${option.property}`) !== 'false' ? option.defaultVisible : false; // Remember user preference

        const label = document.createElement('label');
        label.htmlFor = `display-${option.property}-${taskId}`;
        label.textContent = option.label;
        label.style.display = 'block';

        checklistContainer.appendChild(checkbox);
        checklistContainer.appendChild(label);

        checkbox.addEventListener('change', () => {
            const elementsToToggle = eventList.querySelectorAll(`.event-item[data-task-id="${taskId}"] .${option.className}`);
            elementsToToggle.forEach(el => {
                el.style.display = checkbox.checked ? 'block' : 'none';
            });
            localStorage.setItem(`display-${option.property}`, checkbox.checked); // Save user preference
        });
    });


    document.body.appendChild(checklistContainer);
    currentDisplayOptionsChecklist = checklistContainer;

    // Close the checklist when clicking outside
    setTimeout(() => {
        document.addEventListener('click', closeDisplayOptionsChecklist);
    }, 0);
}

function closeDisplayOptionsChecklist(event) {
    if (currentDisplayOptionsChecklist && !currentDisplayOptionsChecklist.contains(event.target)) {
        currentDisplayOptionsChecklist.remove();
        currentDisplayOptionsChecklist = null;
        document.removeEventListener('click', closeDisplayOptionsChecklist);
    }
}

async function uploadFile(taskId, file) {
    if (!taskId || !file || !currentUser) {
        console.error('Missing task ID, file, or user.');
        return;
    }

    const bucketName = 'files'; // Changed to your bucket name
    const filePath = `tasks/${currentUser}/${taskId}/${file.name}`; // Path within your 'files' bucket

    try {
        const { data, error } = await db
            .storage
            .from(bucketName)
            .upload(filePath, file, { upsert: false });

        if (error) {
            console.error('Error uploading file:', error);
            alert('Failed to upload file.');
        } else {
            console.log('File uploaded successfully:', data);
            const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${data.path}`; // Construct public URL

            // Store the file URL in the Tasks table
            const { error: dbError } = await db
                .from('Tasks')
                .update({ file_url: fileUrl, file_name: file.name })
                .eq('Task_ID', taskId);

                if (dbError) {
                    // ...
                } else {
                    console.log('File URL saved to database:', fileUrl);
                    const index = allEvents.findIndex(event => event.Task_ID === taskId);
                    if (index !== -1) {
                        allEvents[index].file_url = fileUrl;
                        allEvents[index].file_name = file.name;
                    }
                    showTaskDetails(taskId, false);
                }
        }
    } catch (error) {
        console.error('Error during file upload:', error);
        alert('An unexpected error occurred during file upload.');
    }
}

function updateStreakOnTaskComplete() {
    const today = new Date().toDateString();
    const lastCompletedDate = localStorage.getItem('lastCompletedDate');
    let currentStreak = parseInt(localStorage.getItem('currentStreak') || '0', 10);

    if (lastCompletedDate === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastCompletedDate === yesterday.toDateString()) {
        currentStreak += 1;
    } else {
        currentStreak = 1;
    }

    localStorage.setItem('lastCompletedDate', today);
    localStorage.setItem('currentStreak', currentStreak.toString());
    updateStreakUI();
}

function updateStreakUI() {
    const streak = parseInt(localStorage.getItem('currentStreak') || '0', 10);
    const streakDisplay = document.getElementById('streak-counter');
    if (streakDisplay) {
        streakDisplay.textContent = `Your current streak: ${streak} day${streak !== 1 ? 's' : ''}`;
    }
}

function generateWeeklyReport() {
    const taskDetailsSection = document.getElementById('taskDetailsSection'); // Get taskDetailsSection
    if (taskDetailsSection) {
        taskDetailsSection.style.display = 'none'; // Safely hide it
    }

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const completedThisWeek = allEvents.filter(task => {
        if (!task.completed) return false;
        const taskDate = new Date(task.due_date);
        return taskDate >= startOfWeek && taskDate <= now;
    });

    const totalCompletedThisWeek = completedThisWeek.length;
    const currentStreak = parseInt(localStorage.getItem('currentStreak') || '0', 10);

    const reportHtml = `
        <p><strong>Tasks Completed This Week:</strong> ${totalCompletedThisWeek}</p>
        <p><strong>Current Streak:</strong> ${currentStreak} day${currentStreak !== 1 ? 's' : ''}</p>
    `;

    const reports = JSON.parse(localStorage.getItem('weeklyReports') || '[]');

reports.push({
    weekStart: startOfWeek.toDateString(),
    weekEnd: now.toDateString(),
    tasksCompleted: totalCompletedThisWeek,
    streak: currentStreak
});

localStorage.setItem('weeklyReports', JSON.stringify(reports));

    document.getElementById('weeklyReportContent').innerHTML = reportHtml;
    document.getElementById('weeklyReportModal').style.display = 'flex';
}

function viewAllWeeklyReports() {
    const reports = JSON.parse(localStorage.getItem('weeklyReports') || '[]');
    if (reports.length === 0) {
        alert("No reports found yet!");
        return;
    }

    let reportText = "Past Weekly Reports:\n\n";

    reports.forEach((r, index) => {
        reportText += `Week ${index + 1} (${r.weekStart} ➔ ${r.weekEnd}):\n`;
        reportText += `- Tasks Completed: ${r.tasksCompleted}\n`;
        reportText += `- Streak: ${r.streak} day${r.streak !== 1 ? 's' : ''}\n\n`;
    });

    alert(reportText);
}

function viewAllWeeklyReports() {
    const reports = JSON.parse(localStorage.getItem('weeklyReports') || '[]');
    if (reports.length === 0) {
        alert("No reports found yet!");
        return;
    }

    let reportHtml = "<h2>Past Weekly Reports</h2>";

    reports.forEach((r, index) => {
        reportHtml += `
            <div style="margin-bottom: 15px;">
                <strong>Week ${index + 1} (${r.weekStart} ➔ ${r.weekEnd}):</strong><br>
                Tasks Completed: ${r.tasksCompleted}<br>
                Streak: ${r.streak} day${r.streak !== 1 ? 's' : ''}
            </div>
        `;
    });

    const weeklyReportContent = document.getElementById('weeklyReportContent');
    if (weeklyReportContent) {
        weeklyReportContent.innerHTML = reportHtml;
    }

    const weeklyReportModal = document.getElementById('weeklyReportModal');
    if (weeklyReportModal) {
        weeklyReportModal.style.display = 'flex';
    }
}

function clearWeeklyReports() { //clear weekly reports
    if (confirm("Are you sure you want to clear all weekly reports?")) {
        localStorage.removeItem('weeklyReports');
        alert("All weekly reports have been cleared!");
    }
}


// Initially hide the task details section
taskDetailsSection.style.display = 'none';

window.onload = () => {
    const closeScheduleModal = document.getElementById('closeScheduleModal');
    if (closeScheduleModal) {
        closeScheduleModal.addEventListener('click', () => {
            document.getElementById('scheduleBlockModal').style.display = 'none';
        });
    }
    document.getElementById('createScheduleBlockButton')?.addEventListener('click', () => {
        document.getElementById('scheduleBlockModal').style.display = 'flex';
    });
    
    const scheduleBlockModal = document.getElementById('scheduleBlockModal');
    window.addEventListener('click', (event) => {
        if (event.target === scheduleBlockModal) {
            document.getElementById('scheduleBlockModal').style.display = 'none';
        }
    });

    

    const saveScheduleBlockButton = document.getElementById('saveScheduleBlock');
    if (saveScheduleBlockButton) {
        saveScheduleBlockButton.addEventListener('click', async () => {
            const blockTitle = document.getElementById('blockTitle').value.trim();
            const startTime = document.getElementById('startTime').value;
            const endTime = document.getElementById('endTime').value;
            const dayCheckboxes = document.querySelectorAll('input[name="days"]:checked');
            const selectedDays = Array.from(dayCheckboxes).map(cb => cb.value);
    
            if (!blockTitle || !startTime || !endTime || selectedDays.length === 0) {
                alert('Please fill out all fields and select at least one day.');
                return;
            }
    
            const fixedStartTime = startTime.length === 5 ? `${startTime}:00` : startTime;
            const fixedEndTime = endTime.length === 5 ? `${endTime}:00` : endTime;
    
            const newBlock = {
                Username: currentUser,
                Title: blockTitle,
                Start_time: fixedStartTime,
                End_time: fixedEndTime,
                Days: selectedDays
            };
    
            
            const editingBlockId = document.getElementById('scheduleBlockModal').dataset.editingBlockId;
            if (editingBlockId) {
                
                const { error } = await db
                    .from('schedule_blocks')
                    .update(newBlock)
                    .eq('Block_id', editingBlockId);
    
                if (error) {
                    console.error('Error updating schedule block:', error);
                    alert('Failed to update block.');
                } else {
                    await fetchScheduleBlocks();
                    renderCalendar(currentDate);
                    document.getElementById('scheduleBlockModal').dataset.editingBlockId = '';
                }
    
                document.getElementById('scheduleBlockModal').style.display = 'none';
                document.getElementById('blockTitle').value = '';
                document.getElementById('startTime').value = '';
                document.getElementById('endTime').value = '';
                document.querySelectorAll('input[name="days"]').forEach(cb => cb.checked = false);
                return;
            }
    
        
            const { data, error } = await db.from('schedule_blocks').insert([newBlock]).select();
    
            if (error) {
                console.error('Error saving schedule block:', error);
                alert('Failed to save schedule block.');
            } else {
                console.log('Schedule block saved:', data);
                allScheduleBlocks.push(...data);
                renderCalendar(currentDate);
    
                // Close the modal and reset fields
                document.getElementById('scheduleBlockModal').style.display = 'none';
                document.getElementById('blockTitle').value = '';
                document.getElementById('startTime').value = '';
                document.getElementById('endTime').value = '';
                document.querySelectorAll('input[name="days"]').forEach(cb => cb.checked = false);
            }
        });
    }
    
};


const generateReportBtn = document.getElementById('generateReportBtn');
const viewReportsBtn = document.getElementById('viewReportsBtn');
const closeReportModalBtn = document.getElementById('closeReportModal');
const weeklyReportModal = document.getElementById('weeklyReportModal');
const clearReportsBtn = document.getElementById('clearReportsBtn');


function attachEventListeners() {
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', generateWeeklyReport);
    } else {
        console.error("Error: #generateReportBtn not found");
    }

    if (viewReportsBtn) {
        viewReportsBtn.addEventListener('click', viewAllWeeklyReports);
    } else {
        console.error("Error: #viewReportsBtn not found");
    }

    if (clearReportsBtn) {
        clearReportsBtn.addEventListener('click', clearWeeklyReports);
    } else {
        console.error("Error: #clearReportsBtn not found");
    }

    if (closeReportModalBtn) {
        closeReportModalBtn.addEventListener('click', () => {
            weeklyReportModal.style.display = 'none';
        });
    } else {
        console.error("Error: #closeReportModal not found");
    }
}

document.addEventListener('DOMContentLoaded', attachEventListeners);




updateStreakUI();
setInterval(checkReminders, 30000); // check every 30 seconds

function updateProgressBar() {
    const totalTasks = allEvents.length;
    const completedTasks = allEvents.filter(task => task.completed).length;

    const percent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    progressFill.style.width = percent + '%';
    progressText.textContent = `${percent}% Complete`;
}

function renderScheduleBlocksList() {
    const scheduleBlocksList = document.getElementById('scheduleBlocksList');
    if (!scheduleBlocksList) return;
    scheduleBlocksList.innerHTML = '';

    if (allScheduleBlocks.length === 0) {
        scheduleBlocksList.innerHTML = '<p>No schedule blocks yet.</p>';
        return;
    }

    allScheduleBlocks.forEach(block => {
        const blockDiv = document.createElement('div');
        blockDiv.classList.add('schedule-block-item');

        blockDiv.innerHTML = `
            <strong>${block.Title}</strong><br>
            ${block.Start_time.slice(0, 5)} - ${block.End_time.slice(0, 5)}<br>
            Days: ${Array.isArray(block.Days) ? block.Days.join(', ') : block.Days}
        `;

        const btnContainer = document.createElement('div');
        btnContainer.classList.add('block-buttons');

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => openEditScheduleBlockModal(block));

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', async () => {
            const confirmDelete = confirm(`Delete block "${block.Title}"?`);
            if (confirmDelete) {
                await deleteBlock(block.Block_id);
                await fetchScheduleBlocks();
                renderScheduleBlocksList();
                renderCalendar(currentDate);
            }
        });

        btnContainer.appendChild(editBtn);
        btnContainer.appendChild(deleteBtn);
        blockDiv.appendChild(btnContainer);
        scheduleBlocksList.appendChild(blockDiv);
    });
}
