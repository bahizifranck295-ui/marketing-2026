<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/3a763da3-68fe-4ca7-bb55-cc56a9a6d0f2

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Import du matin (pointeuse ZKTeco, clé USB)

Paramètres › Pointeuse ZKTeco › « Import du matin » accepte :

- le fichier copié sur la clé USB (`AttLog.dat`, `.txt`, `.csv`) et les listes Excel : lus directement ;
- une photo ou un PDF du rapport imprimé : lu par [OpenOCR](https://github.com/Topdu/OpenOCR) (Apache-2.0), dans le navigateur.

Chaque agent est retrouvé par son matricule, son ID pointeuse ou son nom. Un aperçu permet de vérifier avant d'écrire dans le carnet.
Les agents actifs sans pointage ce jour-là sont marqués absents.

Fichiers du moteur OCR (servis tels quels) :

- `public/ocr/det.onnx` : modèle de détection `openocr_det_model.onnx` ;
- `public/ocr/rec.onnx.part0` et `part1` : modèle de lecture `openocr_rec_model.onnx`, découpé en deux ;
- `public/ocr/keys.txt` : dictionnaire `ppocr_keys_v1.txt` ;
- `public/ocr/manifest.json` : liste des morceaux de chaque modèle, en binaire (`raw`) ou en texte `base64` pour un hébergement qui ne sert pas les fichiers `.onnx` ;
- `public/ort/` : moteur WebAssembly d'onnxruntime-web.

Les modèles viennent de la version `develop0.0.1` d'OpenOCR. Pour les remplacer :
`split -b 13000000 -d -a 1 openocr_rec_model.onnx public/ocr/rec.onnx.part`.
