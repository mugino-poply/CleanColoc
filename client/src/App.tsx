import { useEffect, useState } from 'react';
import 'bulma/css/bulma.min.css';
// Définition d'une interface pour le typage
// Sera couvert plus en profondeur en TH
interface User {
    id: number;
    nom: string;
    prenom: string;
}

function App() {
    // 1. Définition de l'état
    const [data, setData] = useState<User[]>([]);

    // 2. Appel API au montage du composant
    useEffect(() => {
        fetch(`${import.meta.env.VITE_API_URL}/users`)
            .then(res => res.json())
            .then(result => setData(result))
            .catch(err => console.error(err));
    }, []);
    // 3. Rendu (JSX)
    return (
        <section className="section">
            <div className="container">
                <h1 className="title">Liste des utilisateurs</h1>
                <div className="box">
                    <ul className="list is-hoverable">
                        {data.map((item) => (
                    <li key={item.id}>{item.nom} {item.prenom}</li>
                ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}

export default App;