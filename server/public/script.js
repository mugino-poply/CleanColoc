document.addEventListener('DOMContentLoaded', function() {
    chargerUsers();

    const formulaire = document.getElementById('formulaire');
    if (formulaire) {
        formulaire.addEventListener('submit', function(e) {
            e.preventDefault(); // Empêche la page de se recharger
            ajouterUser();
        });
    }
});

async function chargerUsers() {
    try {
        const response = await fetch('/api/users');
        const users = await response.json();
        
        const liste = document.getElementById('listeEtudiants');
        liste.innerHTML = '';

        for (const user of users) {
            const li = document.createElement('li');
            li.className = 'list-item mb-3 p-4 has-background-light has-border-radius has-text-weight-medium is-flex is-justify-content-space-between is-align-items-center';
            li.dataset.id = user.id;
            const spanNom = document.createElement('span');
            spanNom.style.cursor = 'pointer';
            spanNom.style.color = '#209cee';
            spanNom.innerHTML = `<strong>${user.nom} ${user.prenom}</strong>`;
            spanNom.addEventListener('click', () => {
                window.location.href = `/index-detail.html?id=${user.id}`;
            });
            const btnSupprimer = document.createElement('button');
            btnSupprimer.className = 'button is-danger is-light is-small';
            btnSupprimer.innerHTML = 'X';
            btnSupprimer.title = 'Supprimer';
            btnSupprimer.addEventListener('click', function() {
                supprimerUser(user.id);
            });
            
            li.appendChild(spanNom);
            li.appendChild(btnSupprimer);
            liste.appendChild(li);
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

async function ajouterUser() {
    const nom = document.getElementById('nom').value.trim();
    const prenom = document.getElementById('prenom').value.trim();
    
    if (!nom || !prenom) {
        alert('Nom et prénom requis !');
        return;
    }
    
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nom, prenom })
        });
        
        if (response.ok) {
            document.getElementById('nom').value = '';
            document.getElementById('prenom').value = '';
            
            await chargerUsers();
            
            const btn = document.getElementById('Ajouter');
            const oldText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Ajouté !';
            btn.classList.add('is-success');
            setTimeout(() => {
                btn.innerHTML = oldText;
                btn.classList.remove('is-success');
            }, 1500);
        }
    } catch (error) {
        console.error('Erreur ajout:', error);
    }
}

async function supprimerUser(id) {
    if (!confirm(`Supprimer l'étudiant ?`)) return;
    
    try {
        const response = await fetch(`/api/users/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            chargerUsers();
        }
    } catch (error) {
        console.error('Erreur suppression:', error);
    }
}