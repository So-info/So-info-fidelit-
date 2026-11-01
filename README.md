# So info Fidélité — prototype

Prototype statique de carte de fidélité à 10 passages, aux couleurs So info.

## Tester
Ouvrir `index.html` dans un navigateur. Saisir un nom de client. Dans l'espace commerçant, le code de démonstration est `SOINFO-DEMO`.

## Publier
Dans GitHub, ouvrir le dépôt, choisir **Add file → Upload files**, déposer les fichiers de ce dossier à la racine, puis **Commit changes**.

Pour activer GitHub Pages : **Settings → Pages → Deploy from a branch → main → /(root) → Save**.

## Limites importantes
Cette version est uniquement un prototype local : les données sont stockées dans le navigateur via localStorage, sans synchronisation entre appareils, sans authentification réelle et sans protection adaptée à une utilisation commerciale. Ne pas y enregistrer de vraies données clients ni utiliser le code de démonstration en production.

Pour la version réelle multi-clients, il faudra ajouter une base de données et une authentification sécurisée (par exemple Supabase). GitHub Pages sert les fichiers statiques, pas le backend. Une vraie carte Apple Wallet (.pkpass) exige aussi un pass signé avec un certificat Apple.
