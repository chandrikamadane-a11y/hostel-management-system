// ---------- Data (saved in browser localStorage) ----------
const KEY = "hostelData";
let db = JSON.parse(localStorage.getItem(KEY) || "null") || {
  rooms: [{ id: 1, no: "101", type: "Double", cap: 2 }, { id: 2, no: "102", type: "Single", cap: 1 }],
  students: [{ id: 1, name: "Riya Patil", phone: "9876543210", course: "B.Sc. IT", roomId: 1, fee: 4000, paid: true }]
};
let editId = null;
const $ = id => document.getElementById(id);
const save = () => localStorage.setItem(KEY, JSON.stringify(db));
const nextId = list => list.reduce((m, x) => Math.max(m, x.id), 0) + 1;
const occ = roomId => db.students.filter(s => s.roomId === roomId).length;
const roomName = id => (db.rooms.find(r => r.id === id) || {}).no || "-";
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2000);
}

// ---------- Login ----------
function showApp(on) { $("login").hidden = on; $("app").hidden = !on; if (on) render(); }
$("loginForm").addEventListener("submit", e => {
  e.preventDefault();
  if ($("user").value === "admin" && $("pass").value === "admin123") {
    sessionStorage.setItem("in", "1"); $("loginErr").textContent = ""; showApp(true);
  } else $("loginErr").textContent = "Wrong username or password.";
});
$("logout").onclick = () => { sessionStorage.removeItem("in"); showApp(false); };

// ---------- Navigation ----------
document.querySelectorAll("nav button").forEach(b => b.onclick = () => {
  document.querySelectorAll("nav button").forEach(x => x.classList.toggle("active", x === b));
  document.querySelectorAll(".view").forEach(v => v.hidden = v.id !== b.dataset.view);
  render();
});

// ---------- Rooms ----------
$("roomForm").addEventListener("submit", e => {
  e.preventDefault();
  const no = $("roomNo").value.trim();
  if (db.rooms.some(r => r.no === no)) return toast("Room " + no + " already exists");
  db.rooms.push({ id: nextId(db.rooms), no, type: $("roomType").value, cap: +$("roomCap").value });
  save(); e.target.reset(); render(); toast("Room added");
});
function deleteRoom(id) {
  if (occ(id)) return toast("Move the students out of this room first");
  if (!confirm("Delete this room?")) return;
  db.rooms = db.rooms.filter(r => r.id !== id); save(); render(); toast("Room deleted");
}

// ---------- Students ----------
$("stuForm").addEventListener("submit", e => {
  e.preventDefault();
  const roomId = +$("sRoom").value, room = db.rooms.find(r => r.id === roomId);
  const current = db.students.find(s => s.id === editId);
  const taken = occ(roomId) - (current && current.roomId === roomId ? 1 : 0);
  if (taken >= room.cap) return toast("Room " + room.no + " is full");
  const data = { name: $("sName").value.trim(), phone: $("sPhone").value, course: $("sCourse").value.trim(), roomId, fee: +$("sFee").value };
  if (current) { Object.assign(current, data); toast("Student updated"); }
  else { db.students.push({ id: nextId(db.students), paid: false, ...data }); toast("Student added"); }
  editId = null; $("stuBtn").textContent = "Add student"; e.target.reset(); save(); render();
});
function editStudent(id) {
  const s = db.students.find(x => x.id === id); editId = id;
  $("sName").value = s.name; $("sPhone").value = s.phone; $("sCourse").value = s.course;
  $("sRoom").value = s.roomId; $("sFee").value = s.fee; $("stuBtn").textContent = "Save changes";
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function deleteStudent(id) {
  if (!confirm("Remove this student?")) return;
  db.students = db.students.filter(s => s.id !== id); save(); render(); toast("Student removed");
}
$("search").addEventListener("input", renderStudents);

// ---------- Fees ----------
function togglePaid(id) {
  const s = db.students.find(x => x.id === id); s.paid = !s.paid; save(); render();
  toast(s.paid ? "Marked as paid" : "Marked as pending");
}

// ---------- Rendering ----------
const stat = (n, label) => `<div class="stat"><b>${n}</b><span>${label}</span></div>`;
const none = (cols, msg) => `<tr><td colspan="${cols}" class="empty">${msg}</td></tr>`;

function renderDashboard() {
  const cap = db.rooms.reduce((a, r) => a + r.cap, 0), n = db.students.length;
  $("stats").innerHTML = stat(db.rooms.length, "Rooms") + stat(n, "Students") + stat(cap - n, "Beds free") +
    stat(db.students.filter(s => !s.paid).length, "Fees pending");
  $("bars").innerHTML = db.rooms.map(r => {
    const o = occ(r.id), p = Math.round(o / r.cap * 100);
    return `<div class="bar"><span>Room ${esc(r.no)}</span><div class="track"><div class="fill ${p >= 100 ? "full" : ""}" style="width:${p}%"></div></div><span>${o}/${r.cap}</span></div>`;
  }).join("") || "<p>Add a room to see occupancy.</p>";
}
function renderRooms() {
  $("roomRows").innerHTML = db.rooms.map(r => {
    const o = occ(r.id), full = o >= r.cap;
    return `<tr><td>${esc(r.no)}</td><td>${r.type}</td><td>${o} / ${r.cap}</td>
      <td><span class="tag ${full ? "bad" : "ok"}">${full ? "Full" : "Available"}</span></td>
      <td><button class="mini del" onclick="deleteRoom(${r.id})">Delete</button></td></tr>`;
  }).join("") || none(5, "No rooms yet. Add your first room above.");
}
function renderStudents() {
  const q = $("search").value.toLowerCase();
  const sel = $("sRoom").value;
  $("sRoom").innerHTML = db.rooms.map(r => `<option value="${r.id}">Room ${esc(r.no)} (${occ(r.id)}/${r.cap})</option>`).join("") || "<option value=''>Add a room first</option>";
  if (sel) $("sRoom").value = sel;
  const list = db.students.filter(s => (s.name + s.course + roomName(s.roomId)).toLowerCase().includes(q));
  $("stuRows").innerHTML = list.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.phone)}</td><td>${esc(s.course)}</td><td>${esc(roomName(s.roomId))}</td>
    <td><button class="mini" onclick="editStudent(${s.id})">Edit</button><button class="mini del" onclick="deleteStudent(${s.id})">Remove</button></td></tr>`).join("")
    || none(5, "No students found.");
}
function renderFees() {
  const paid = db.students.filter(s => s.paid).reduce((a, s) => a + s.fee, 0);
  const due = db.students.filter(s => !s.paid).reduce((a, s) => a + s.fee, 0);
  $("feeStats").innerHTML = stat("₹" + paid.toLocaleString("en-IN"), "Collected") + stat("₹" + due.toLocaleString("en-IN"), "Pending");
  $("feeRows").innerHTML = db.students.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(roomName(s.roomId))}</td><td>₹${s.fee.toLocaleString("en-IN")}</td>
    <td><span class="tag ${s.paid ? "ok" : "bad"}">${s.paid ? "Paid" : "Pending"}</span></td>
    <td><button class="mini" onclick="togglePaid(${s.id})">${s.paid ? "Mark pending" : "Mark paid"}</button></td></tr>`).join("")
    || none(5, "No students to bill yet.");
}
function render() { renderDashboard(); renderRooms(); renderStudents(); renderFees(); }

// ---------- Start ----------
showApp(sessionStorage.getItem("in") === "1");