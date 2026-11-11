// Import Firebase SDK (Versi Modular)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// TODO: GANTI INI DENGAN CONFIG DARI FIREBASE PROJECT-MU!
const firebaseConfig = {
  apiKey: "AIzaSyB8BpI77t-zF0Ua2Ig57FSetZy_3rW8KMk",
  authDomain: "sepatu-roda-dd8f8.firebaseapp.com",
  projectId: "sepatu-roda-dd8f8",
  storageBucket: "sepatu-roda-dd8f8.firebasestorage.app",
  messagingSenderId: "152130637307",
  appId: "1:152130637307:web:5e92c457bf99dc9ae94f5e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rentalsCollection = collection(db, "rentals");

const products = [
    { id: 1, name: 'Inline Skate Pro Red', image: 'assets/sepatu-roda-images.jpeg' },
    { id: 2, name: 'Classic Retro Blue', image: 'assets/sepatu-roda-images.jpeg' },
    { id: 3, name: 'Urban Freeskate Black', image: 'assets/sepatu-roda-images.jpeg' },
    { id: 4, name: 'Speed Skates White', image: 'assets/sepatu-roda-images.jpeg' },
    { id: 5, name: 'Vintage Pink Roller', image: 'assets/sepatu-roda-images.jpeg' }
];

let activeRentals = [];

// DOM Elements - General
const productListEl = document.getElementById('product-list');
const activeRentalsEl = document.getElementById('active-rentals');
const modal = document.getElementById('rental-modal');
const closeBtn = document.querySelector('.close-btn');
const rentalForm = document.getElementById('rental-form');

// DOM Elements - Sidebar & Views
const sidebar = document.getElementById('sidebar');
const menuBtn = document.getElementById('menu-btn');
const closeSidebarBtn = document.getElementById('close-sidebar');
const viewKatalog = document.getElementById('view-katalog');
const viewHistory = document.getElementById('view-history');
const menuKatalog = document.getElementById('menu-katalog');
const menuHistory = document.getElementById('menu-history');
const historyListEl = document.getElementById('history-list');

// ===== LOGIKA MENU SIDEBAR =====
menuBtn.onclick = () => sidebar.classList.add('open');
closeSidebarBtn.onclick = () => sidebar.classList.remove('open');

menuKatalog.onclick = (e) => {
    e.preventDefault();
    viewKatalog.classList.remove('d-none');
    viewHistory.classList.add('d-none');
    menuKatalog.classList.add('active');
    menuHistory.classList.remove('active');
    sidebar.classList.remove('open'); // Tutup sidebar setelah diklik
};

menuHistory.onclick = (e) => {
    e.preventDefault();
    viewHistory.classList.remove('d-none');
    viewKatalog.classList.add('d-none');
    menuHistory.classList.add('active');
    menuKatalog.classList.remove('active');
    sidebar.classList.remove('open');
};


// ===== FETCH DATA ACTIVE RENTALS DARI FIREBASE =====
const activeQ = query(rentalsCollection, where("status", "==", "active"));
onSnapshot(activeQ, (snapshot) => {
    activeRentals = [];
    products.forEach(p => p.isRented = false);

    snapshot.forEach((doc) => {
        const data = doc.data();
        activeRentals.push({ docId: doc.id, ...data });

        const product = products.find(p => p.id === data.skateId);
        if (product) product.isRented = true;
    });

    renderProducts();
    renderActiveRentals();
});


// ===== FETCH DATA HISTORY TRANSAKSI DARI FIREBASE =====
const historyQ = query(rentalsCollection, where("status", "==", "finished"));
onSnapshot(historyQ, (snapshot) => {
    let histories = [];
    snapshot.forEach(rentalDoc => histories.push({ ...rentalDoc.data(), docId: rentalDoc.id }));
    
    // Urutkan dari yang terbaru ke terlama menggunakan JavaScript
    histories.sort((a, b) => b.createdAt - a.createdAt);

    historyListEl.innerHTML = '';
    histories.forEach(data => {
        const tr = document.createElement('tr');
        
        // Format Tanggal (Misal: 10/11/2026, 14:30)
        const dateObj = new Date(data.createdAt);
        const dateFormatted = `${dateObj.toLocaleDateString('id-ID')} ${dateObj.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}`;

        tr.innerHTML = `
            <td>${dateFormatted}</td>
            <td>${data.renterName}</td>
            <td>${data.skateName}</td>
            <td>${data.duration} Menit</td>
            <td><strong>Rp ${data.price.toLocaleString('id-ID')}</strong></td>
            <td>
                <button class="history-delete-btn" type="button" aria-label="Hapus transaksi ${data.renterName}" title="Hapus transaksi">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v7m6-7v7" />
                    </svg>
                </button>
            </td>
        `;
        tr.querySelector('.history-delete-btn').addEventListener('click', () => {
            window.deleteHistory(data.docId, data.renterName);
        });
        historyListEl.appendChild(tr);
    });
});


// ===== FUNGSI RENDER =====
function renderProducts() {
    productListEl.innerHTML = '';
    products.forEach(product => {
        if (!product.isRented) {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name}</h3>
                <button onclick="openModal(${product.id})">SEWA SEKARANG</button>
            `;
            productListEl.appendChild(card);
        }
    });
}

function renderActiveRentals() {
    activeRentalsEl.innerHTML = '';
    activeRentals.forEach(rental => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3>${rental.skateName}</h3>
            <div style="text-align: left; font-size: 0.9rem; margin-bottom: 10px;">
                <p style="margin: 5px 0;"><strong>Penyewa:</strong> ${rental.renterName}</p>
                <p style="margin: 5px 0;"><strong>Harga:</strong> Rp ${rental.price.toLocaleString('id-ID')}</p>
            </div>
            <div class="timer" id="timer-${rental.docId}">00:00:00</div>
            <button class="finish-btn" onclick="finishRental('${rental.docId}')">KEMBALIKAN</button>
        `;
        activeRentalsEl.appendChild(card);
    });
}


// ===== LOGIKA MODAL & TRANSAKSI =====
window.openModal = function(id) {
    const product = products.find(p => p.id === id);
    document.getElementById('skate-id').value = id;
    document.getElementById('modal-skate-name').innerText = product.name;
    modal.classList.remove('hidden');
}

closeBtn.onclick = () => modal.classList.add('hidden');
window.onclick = (e) => {
    if (e.target === modal) modal.classList.add('hidden');
};

rentalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = parseInt(document.getElementById('skate-id').value);
    const product = products.find(p => p.id === id);
    const renterName = document.getElementById('renter-name').value;
    const durationMins = parseInt(document.getElementById('duration').value);
    const price = parseInt(document.getElementById('price').value);

    const endTime = new Date().getTime() + (durationMins * 60000);

    try {
        await addDoc(rentalsCollection, {
            skateId: id,
            skateName: product.name,
            renterName: renterName,
            duration: durationMins,
            price: price,
            endTime: endTime,
            status: 'active',
            createdAt: new Date().getTime()
        });
        
        rentalForm.reset();
        modal.classList.add('hidden');
    } catch (error) {
        console.error("Gagal menyimpan data:", error);
        alert("Gagal memproses sewa. Cek koneksi internet.");
    }
});


// ===== KEMBALIKAN SEPATU (PINDAH KE HISTORY) =====
window.finishRental = async function(docId) {
    const confirmFinish = confirm("Apakah sepatu sudah dikembalikan?");
    if (!confirmFinish) return;

    try {
        const rentalRef = doc(db, "rentals", docId);
        // Update status jadi finished, otomatis pindah ke tabel History!
        await updateDoc(rentalRef, {
            status: 'finished',
            finishedAt: new Date().getTime()
        });
    } catch (error) {
        console.error("Gagal update data:", error);
    }
};

// ===== HAPUS TRANSAKSI DARI HISTORY =====
window.deleteHistory = async function(docId, renterName) {
    if (!confirm(`Hapus transaksi atas nama ${renterName}?`)) return;

    try {
        await deleteDoc(doc(db, "rentals", docId));
    } catch (error) {
        console.error("Gagal menghapus transaksi:", error);
        alert("Gagal menghapus transaksi. Cek koneksi internet.");
    }
};


// ===== TIMER SYSTEM =====
function updateTimers() {
    const now = new Date().getTime();

    activeRentals.forEach(rental => {
        const distance = rental.endTime - now;
        const timerEl = document.getElementById(`timer-${rental.docId}`);
        
        if (timerEl) {
            if (distance < 0) {
                timerEl.innerHTML = "WAKTU HABIS";
                timerEl.style.color = "red";
            } else {
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                
                timerEl.innerHTML = 
                    `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
        }
    });
}

setInterval(updateTimers, 1000);