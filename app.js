import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getDatabase,
  onValue,
  push,
  ref,
  remove,
  set,
  update,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBi_GLA5WHBQ0WZWVsqt3VXMANgqX81eiM",
  authDomain: "moon-todo-backend.firebaseapp.com",
  projectId: "moon-todo-backend",
  storageBucket: "moon-todo-backend.firebasestorage.app",
  messagingSenderId: "166215294002",
  appId: "1:166215294002:web:fc13baedd895e26a7ef02b",
  databaseURL: "https://moon-todo-backend-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const todosRef = ref(database, "todos");

const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const submitButton = document.getElementById("submit-button");
const todoList = document.getElementById("todo-list");
const emptyState = document.getElementById("empty-state");
const formMessage = document.getElementById("form-message");

let todos = [];
let editingTodoId = null;
let openMenuTodoId = null;

subscribeTodos();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const value = input.value.trim();

  if (!value) {
    showMessage("할일 내용을 입력해주세요.");
    input.focus();
    return;
  }

  if (editingTodoId) {
    try {
      await update(ref(database, `todos/${editingTodoId}`), { text: value });
      resetForm();
      showMessage("할일이 수정되었습니다.");
    } catch (error) {
      console.error("할일 수정에 실패했습니다.", error);
      showMessage("할일 수정에 실패했습니다.");
    }
    return;
  }

  try {
    const newTodoRef = push(todosRef);

    await set(newTodoRef, {
      text: value,
      createdAt: Date.now(),
      completed: false,
    });

    form.reset();
    input.focus();
    showMessage("할일이 추가되었습니다.");
  } catch (error) {
    console.error("할일 추가에 실패했습니다.", error);
    showMessage("할일 추가에 실패했습니다.");
  }
});

todoList.addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (!button) {
    return;
  }

  const todoId = button.dataset.id;

  if (button.classList.contains("complete-button")) {
    toggleTodoComplete(todoId);
    return;
  }

  if (button.classList.contains("menu-toggle-button")) {
    toggleMenu(todoId);
    return;
  }

  if (button.classList.contains("edit-button")) {
    startEditing(todoId);
    return;
  }

  if (button.classList.contains("delete-button")) {
    deleteTodo(todoId);
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".todo-menu-wrap") && openMenuTodoId) {
    openMenuTodoId = null;
    renderTodos();
  }
});

function subscribeTodos() {
  onValue(
    todosRef,
    (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        todos = [];
        renderTodos();
        return;
      }

      todos = Object.entries(data)
        .map(([id, todo]) => ({
          id,
          text: todo.text,
          createdAt: todo.createdAt ?? 0,
          completed: Boolean(todo.completed),
        }))
        .sort((a, b) => b.createdAt - a.createdAt);

      renderTodos();
    },
    (error) => {
      console.error("할일 목록을 불러오지 못했습니다.", error);
      showMessage("할일 목록을 불러오지 못했습니다.");
    }
  );
}

function renderTodos() {
  todoList.innerHTML = "";

  if (todos.length === 0) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  todos.forEach((todo) => {
    const item = document.createElement("li");
    item.className = [
      "todo-item",
      todo.completed ? "completed" : "",
      openMenuTodoId === todo.id ? "menu-open" : "",
    ]
      .filter(Boolean)
      .join(" ");

    item.innerHTML = `
      <div class="todo-main">
        <button
          class="complete-button"
          data-id="${todo.id}"
          type="button"
          aria-label="할일 완료 상태 변경"
          aria-pressed="${todo.completed}"
        >
          ${todo.completed ? "&#10003;" : ""}
        </button>
        <span class="todo-text">${escapeHtml(todo.text)}</span>
      </div>
      <div class="todo-menu-wrap">
        <button
          class="menu-toggle-button"
          data-id="${todo.id}"
          type="button"
          aria-label="할일 메뉴 열기"
          aria-expanded="${openMenuTodoId === todo.id}"
        >
          &#8942;
        </button>
        <div class="todo-menu ${openMenuTodoId === todo.id ? "visible" : ""}">
          <button class="menu-item edit-button" data-id="${todo.id}" type="button">수정</button>
          <button class="menu-item delete-button" data-id="${todo.id}" type="button">삭제</button>
        </div>
      </div>
    `;

    todoList.appendChild(item);
  });
}

function startEditing(todoId) {
  const selectedTodo = todos.find((todo) => todo.id === todoId);

  if (!selectedTodo) {
    return;
  }

  editingTodoId = todoId;
  openMenuTodoId = null;
  input.value = selectedTodo.text;
  submitButton.textContent = "수정 완료";
  input.focus();
  renderTodos();
  showMessage("수정할 내용을 입력한 뒤 버튼을 눌러주세요.");
}

async function deleteTodo(todoId) {
  try {
    await remove(ref(database, `todos/${todoId}`));

    if (editingTodoId === todoId) {
      resetForm();
    }

    if (openMenuTodoId === todoId) {
      openMenuTodoId = null;
    }

    showMessage("할일이 삭제되었습니다.");
  } catch (error) {
    console.error("할일 삭제에 실패했습니다.", error);
    showMessage("할일 삭제에 실패했습니다.");
  }
}

async function toggleTodoComplete(todoId) {
  const selectedTodo = todos.find((todo) => todo.id === todoId);

  if (!selectedTodo) {
    return;
  }

  try {
    await update(ref(database, `todos/${todoId}`), {
      completed: !selectedTodo.completed,
    });
  } catch (error) {
    console.error("완료 상태 변경에 실패했습니다.", error);
    showMessage("완료 상태 변경에 실패했습니다.");
  }
}

function toggleMenu(todoId) {
  openMenuTodoId = openMenuTodoId === todoId ? null : todoId;
  renderTodos();
}

function resetForm() {
  editingTodoId = null;
  form.reset();
  submitButton.textContent = "추가";
  input.focus();
}

function showMessage(message) {
  formMessage.textContent = message;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
