# PREMIDIS Attendance

Gestion des présences de PREMIDIS SARL (Goma) : import du matin depuis la pointeuse ZKTeco (clé USB, Excel,
photo ou PDF), carnet de présence, retards et sanctions, rapports PDF avec l'en-tête officiel.

Application web statique (React, Vite, TypeScript). Aucune donnée ne quitte le navigateur : tout est enregistré
dans le stockage local du navigateur (clés `premidis_*`).

## Lancer en local

Prérequis : Node.js 20 ou plus récent.

```bash
npm install --legacy-peer-deps
npm run dev        # http://localhost:3000
npm test           # tests unitaires (lecture des fichiers de la pointeuse, sanctions, rôles)
npm run lint       # vérification des types
npm run build      # version de production dans dist/
```

## Mise en ligne

`dist/` est un site statique (chemins relatifs, `base: './'`) : il se dépose sur n'importe quel hébergement
de fichiers (Nginx, Apache, Netlify, GitHub Pages…).

- **HTTPS obligatoire** : la lecture OCR utilise WebAssembly et les comptes sont protégés par un mot de passe.
- Servir `public/ocr/` et `public/ort/` tels quels (types `application/wasm` pour `.wasm`, `text/javascript` pour `.mjs`).
- **Retour arrière** : garder le dossier `dist/` de la version précédente et le remettre en place en cas de problème.
  Les données des utilisateurs ne sont pas touchées par une mise à jour du site.

## Données et sauvegardes

- Chaque navigateur a ses propres données : un import fait sur un ordinateur n'apparaît pas sur un autre.
  Désigner **un poste de référence** pour l'import du matin et la consultation.
- Paramètres › **Sauvegarde** (administrateur) : télécharger une sauvegarde complète, la restaurer, ou démarrer
  à vide (efface les données de démonstration, garde les comptes, les paramètres et les barèmes).
  Une copie de l'état actuel est téléchargée automatiquement avant toute restauration ou tout effacement.
- Faire une sauvegarde **chaque semaine** et avant de vider le navigateur ou de changer d'ordinateur.
- Au premier démarrage, l'application contient des **données de démonstration** (25 employés fictifs, octobre 2026).
  Pour la mise en service : Paramètres › Sauvegarde › Démarrer à vide, puis saisir les vrais employés.
- Comptes de démonstration (mot de passe `admin123`) : connexion en un clic depuis la page de connexion, pour
  les présentations. Un compte dont le mot de passe a été changé n'apparaît plus dans cette liste.

## Limites connues

- Pas de serveur : données, comptes et droits sont gérés dans le navigateur. Un serveur (API et base de données)
  est nécessaire pour partager les données entre plusieurs postes et protéger réellement les droits.
- La bibliothèque Excel (`xlsx` 0.18.5) a des failles connues sur des fichiers piégés ; elle n'est chargée
  qu'au moment d'un import. Remplacer par la version 0.20.3 de `https://cdn.sheetjs.com` dès que possible.
- Les PDF des rapports sont une image de l'aperçu (texte non sélectionnable).

## Import du matin (pointeuse ZKTeco, clé USB)

Paramètres › Pointeuse ZKTeco › « Import du matin » accepte :

- le fichier copié sur la clé USB (`AttLog.dat`, `.txt`, `.csv`) et les listes Excel : lus directement ;
- une photo ou un PDF du rapport imprimé : lu par [OpenOCR](https://github.com/Topdu/OpenOCR) (Apache-2.0), dans le navigateur.

Chaque agent est retrouvé par son matricule, son ID pointeuse ou son nom. Un aperçu permet de vérifier avant d'écrire dans le carnet.
Rien n'est inventé ni écarté en silence : le compte rendu indique le nombre de lignes lues, les pointages
reconnus, les lignes à vérifier (non importées, avec la raison : agent inconnu, date impossible, ID et nom
contradictoires…) et les lignes sans pointage. Tous les pointages et doublons sont conservés. Les absences
(agents actifs sans pointage un jour ouvré) sont déduites : elles ne sont ajoutées que si la case est cochée.

Fichiers du moteur OCR (servis tels quels) :

- `public/ocr/det.onnx` : modèle de détection `openocr_det_model.onnx` ;
- `public/ocr/rec.onnx.part0` et `part1` : modèle de lecture `openocr_rec_model.onnx`, découpé en deux ;
- `public/ocr/keys.txt` : dictionnaire `ppocr_keys_v1.txt` ;
- `public/ocr/manifest.json` : liste des morceaux de chaque modèle, en binaire (`raw`) ou en texte `base64` pour un hébergement qui ne sert pas les fichiers `.onnx` ;
- `public/ort/` : moteur WebAssembly d'onnxruntime-web.

Les modèles viennent de la version `develop0.0.1` d'OpenOCR. Pour les remplacer :
`split -b 13000000 -d -a 1 openocr_rec_model.onnx public/ocr/rec.onnx.part`.
