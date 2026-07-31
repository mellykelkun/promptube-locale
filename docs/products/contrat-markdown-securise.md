# Contrat de sécurisation du Markdown Promptube

## Métadonnées

- **Version du contrat :** `0.1.0`
- **Statut :** `DRAFT`
- **Portée :** fichiers Markdown distribuables dans les paquets de modules Promptube
- **Syntaxe de base :** CommonMark `0.31.2`
- **Extensions initiales :** GitHub Flavored Markdown
- **Encodage :** UTF-8 sans BOM
- **Politique HTML :** HTML brut interdit
- **Politique d’exécution :** contenu strictement inerte
- **Position dans le cycle :** après le contrat du manifeste et avant le stockage
- **Fondations de conception validées par le propriétaire :** 2026-07-30
- **Architecture du validateur validée par le propriétaire :** 2026-07-31

## 1. Objectif

Ce document définit les règles de validation, de transformation et de rendu sécurisé des fichiers
Markdown distribués dans les paquets de modules Promptube.

Il doit permettre :

- de conserver un format lisible et portable ;
- de refuser les contenus actifs ou ambigus ;
- de prévenir les injections HTML, JavaScript et URL ;
- de limiter les risques de déni de service pendant l’analyse ou le rendu ;
- de produire un résultat déterministe ;
- de distinguer le contenu accepté du contenu simplement affichable comme texte ;
- de garantir qu’aucun fichier Markdown ne déclenche une exécution ou un accès réseau automatique.

Un fichier conforme à ce contrat n’est pas automatiquement approuvé, publié ou commercialisable. Il
devient uniquement admissible aux autres contrôles du paquet.

## 2. Références normatives et techniques

La version initiale du contrat s’appuie sur :

- [CommonMark 0.31.2](https://spec.commonmark.org/0.31.2/) pour la syntaxe Markdown de base ;
- [GitHub Flavored Markdown](https://github.github.com/gfm/) pour les tableaux, les listes de
  tâches, le texte barré et les autoliens étendus ;
- [OWASP — Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
  pour les principes de prévention XSS, de sanitisation et de défense en profondeur ;
- [OWASP — Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
  pour la validation précoce des entrées non fiables ;
- [OWASP — Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
  pour la défense complémentaire par CSP ;
- [remark-rehype — Security](https://unifiedjs.com/explore/package/remark-rehype/#security) pour les
  risques liés aux arbres Markdown et à l’option `allowDangerousHtml` ;
- [rehype-sanitize](https://github.com/rehypejs/rehype-sanitize) pour la sanitisation par liste
  positive d’un arbre HTML ;
- [react-markdown — Security](https://unifiedjs.com/explore/package/react-markdown/#security) pour
  les précautions liées aux plugins, aux composants et à la transformation des URL.

Ces références ne remplacent pas les règles plus restrictives du présent contrat.

## 3. Définitions

### Source Markdown

Suite d’octets contenue dans un fichier portant l’extension `.md`.

### Contenu non fiable

Tout contenu provenant d’un paquet importé, y compris lorsqu’il a été produit par le propriétaire,
un collaborateur ou une intelligence artificielle.

### AST Markdown

Arbre syntaxique abstrait produit après l’analyse du Markdown.

### AST HTML

Arbre syntaxique abstrait intermédiaire utilisé pour préparer un rendu HTML ou React.

### HTML brut

Balise, commentaire, déclaration, instruction de traitement, section CDATA ou bloc HTML écrit
directement dans le Markdown hors d’un bloc ou d’un fragment de code.

### Sanitisation

Transformation par liste positive qui supprime ou refuse les nœuds, balises, attributs et protocoles
non autorisés.

### Rendu

Transformation d’un contenu validé en composants visuels non exécutables.

### Lien interne

Lien relatif vers un autre fichier Markdown présent dans le même paquet.

### Lien externe

Lien absolu HTTPS vers une ressource située hors du paquet.

### Contenu actif

Tout contenu capable d’exécuter du code, de charger automatiquement une ressource, de modifier le
DOM de manière arbitraire ou de déclencher une navigation sans action explicite de l’utilisateur.

## 4. Relation avec les autres contrats

Le présent document complète :

- le contrat documentaire des produits ;
- le contrat technique des paquets de modules ;
- le contrat versionné du manifeste ;
- le schéma JSON du manifeste.

Le contrat du paquet définit notamment les fichiers autorisés, les chemins, les limites globales et
l’intégrité. Le présent contrat définit la sécurité du contenu des fichiers `.md`.

En cas de contradiction, la règle la plus restrictive s’applique jusqu’à résolution et versionnage
explicites de la contradiction.

La conformité Markdown ne doit jamais :

- corriger silencieusement une archive non conforme ;
- modifier une empreinte déclarée ;
- créer un fichier absent du manifeste ;
- étendre le périmètre d’un module ;
- contourner une limite définie par le contrat du paquet.

## 5. Modèle de menace

Le validateur doit considérer qu’un fichier Markdown peut tenter :

- une injection XSS stockée ;
- une injection HTML ou SVG ;
- une exécution JavaScript par une URL ;
- un chargement distant utilisé pour le pistage ou l’exfiltration ;
- une redirection trompeuse ;
- un accès à une ressource locale ou privée ;
- une traversée de chemin par un lien relatif ;
- une collision d’identifiants DOM ;
- une injection par un plugin Markdown ;
- une consommation excessive de mémoire ou de processeur ;
- une profondeur d’arbre excessive ;
- une ambiguïté Unicode ou bidirectionnelle ;
- une dissimulation de contenu dans des attributs ou métadonnées ;
- une exécution indirecte par MDX, Mermaid, un moteur mathématique ou un surligneur de code ;
- une divergence entre la validation côté serveur et le rendu côté client.

La provenance interne d’un paquet ne réduit pas ces exigences.

## 6. Principes obligatoires

Tout traitement Markdown doit respecter les principes suivants :

- traiter le contenu comme non fiable ;
- valider avant de stocker comme version admissible ;
- valider de nouveau avant toute publication si le pipeline ou le contrat a changé ;
- ne jamais exécuter le contenu ;
- ne jamais charger automatiquement une ressource citée ;
- utiliser une liste positive de syntaxes et de nœuds ;
- refuser toute syntaxe inconnue ;
- ne pas activer de plugin non approuvé ;
- ne pas utiliser le HTML brut ;
- ne pas utiliser MDX ;
- ne pas transformer un bloc de code en contenu actif ;
- ne pas se fier uniquement à une expression régulière ;
- ne pas se fier uniquement à l’échappement produit par React ;
- ne pas se fier uniquement à une Content Security Policy ;
- appliquer les mêmes règles au serveur et au client ;
- produire des erreurs explicites sans exposer de secret ;
- échouer de manière fermée lorsqu’un contrôle ne peut pas être exécuté.

Le propriétaire a validé le 30 juillet 2026 les sept fondations de conception suivantes :

1. le format initial est textuel et limité au Markdown et au JSON, sans image ;
2. tout contenu exécutable est interdit, notamment HTML, MDX, JSX, JavaScript actif, formulaire,
   `iframe` et SVG actif ;
3. seuls les liens externes HTTPS et les liens relatifs vers des fichiers Markdown inventoriés sont
   autorisés ;
4. les liens vers des fragments internes, tels que `#section`, restent interdits tant qu’un
   algorithme d’identifiants stable et sécurisé n’est pas défini ;
5. les contenus Mermaid et mathématiques restent inertes et sont affichés uniquement comme du code ;
6. la protection combine la validation de l’AST Markdown, une sanitisation fermée et une Content
   Security Policy utilisée comme défense complémentaire ;
7. les limites de taille, profondeur, nœuds, liens, tableaux et temps de traitement restent
   provisoires jusqu’à leur confirmation par des tests représentatifs.

Cette validation fixe la base de conception du futur validateur. Elle ne fait pas passer le contrat
à `APPROVED` : son statut reste `DRAFT` tant que le pipeline, la sanitisation et les scénarios de
sécurité ne sont pas implémentés et testés.

Le propriétaire a validé le 31 juillet 2026 les décisions d’architecture suivantes :

- la pile exacte `unified`, `remark-parse`, `remark-gfm`, `remark-rehype`, `rehype-sanitize` et
  `ipaddr.js` ;
- une API serveur unique recevant les octets, le chemin logique, l’inventaire et la corrélation ;
- un DTO fermé et profondément immuable comme seule sortie rendable ;
- des projections GFM contrôlées, sans case interactive, classe de langage ni alignement libre ;
- un schéma de sanitisation construit depuis zéro ;
- une isolation obligatoire avant toute entrée non fiable ;
- le phasage d’implémentation du cœur, des contrôles, des tests et du worker ;
- l’interdiction de toute accolade non échappée hors code dans la version initiale ;
- le report du rendu React à une branche distincte.

Ces décisions ne modifient pas le statut `DRAFT`.

## 7. Encodage et représentation

Chaque fichier Markdown doit :

- être un fichier régulier ;
- porter l’extension exacte `.md` ;
- être encodé en UTF-8 valide ;
- ne pas contenir de BOM ;
- ne pas contenir d’octet nul ;
- utiliser des fins de ligne LF ;
- se terminer par une fin de ligne ;
- respecter les limites du contrat du paquet.

Le validateur doit refuser :

- un encodage invalide ;
- une séquence UTF-8 surlongue ;
- un caractère de remplacement introduit par un décodage tolérant ;
- un contenu binaire déguisé en Markdown ;
- un fichier vide lorsque le contrat du paquet exige un contenu non vide.

Le validateur ne doit pas réécrire le fichier pendant son contrôle.

## 8. Jeu de syntaxe autorisé

La version initiale autorise uniquement :

- les paragraphes ;
- les titres de niveaux 1 à 6 ;
- les emphases ;
- les emphases fortes ;
- le texte barré GFM ;
- les citations ;
- les listes ordonnées ;
- les listes non ordonnées ;
- les listes de tâches GFM rendues de manière non interactive ;
- les séparateurs horizontaux ;
- les sauts de ligne CommonMark ;
- les fragments de code en ligne ;
- les blocs de code indentés ;
- les blocs de code clôturés ;
- les tableaux GFM ;
- les liens explicites conformes au présent contrat ;
- les liens par référence conformes au présent contrat ;
- les autoliens conformes au présent contrat ;
- les caractères échappés définis par CommonMark.

Toute extension absente de cette liste est interdite par défaut.

## 9. Nœuds Markdown autorisés

Après analyse, l’AST Markdown peut contenir uniquement les types de nœuds suivants :

- `root` ;
- `paragraph` ;
- `text` ;
- `heading` ;
- `thematicBreak` ;
- `blockquote` ;
- `list` ;
- `listItem` ;
- `emphasis` ;
- `strong` ;
- `delete` ;
- `inlineCode` ;
- `code` ;
- `break` ;
- `link` ;
- `linkReference` ;
- `definition` ;
- `table` ;
- `tableRow` ;
- `tableCell`.

Le validateur doit parcourir récursivement l’intégralité de l’arbre. Un type absent de cette liste
entraîne le rejet du fichier.

Les champs libres capables d’influencer la conversion HTML, notamment `data.hName`,
`data.hProperties` et `data.hChildren`, sont interdits sur tous les nœuds.

## 10. Syntaxes interdites

La version initiale interdit notamment :

- le HTML brut ;
- les images Markdown ;
- les images par référence ;
- MDX ;
- JSX ;
- les expressions JavaScript ;
- les imports et exports ;
- les directives personnalisées ;
- les composants personnalisés ;
- les notes de bas de page ;
- les listes de définitions ;
- les attributs personnalisés ;
- les classes ou identifiants fournis par l’auteur ;
- les blocs de métadonnées YAML ou TOML ;
- les balises de script ou de style ;
- les contenus SVG et MathML ;
- les iframes ;
- les objets intégrés ;
- les formulaires ;
- les éléments audio ou vidéo ;
- les feuilles de style ;
- les scripts ;
- les événements DOM ;
- les URL de données ;
- les diagrammes exécutables ;
- les formules mathématiques exécutées par un plugin ;
- tout mécanisme nécessitant `allowDangerousHtml`.

Une syntaxe interdite située dans un bloc ou un fragment de code reste autorisée comme texte inerte.

Dans la version initiale, toute accolade `{` ou `}` non échappée est interdite hors :

- fragment de code en ligne ;
- bloc de code clôturé ;
- bloc de code indenté.

Les formes `\{` et `\}` restent autorisées. Le contrôle utilise les positions des zones de code
déterminées par le parseur CommonMark/GFM ; aucun analyseur MDX supplémentaire n’est installé.

Les parcours des accolades, instructions de module et références explicites utilisent des curseurs
monotones sur les plages de code triées. Leur complexité doit rester linéaire par rapport à la
taille de la source et au nombre de plages.

## 11. HTML brut

Tout nœud Markdown de type `html` doit entraîner le rejet du fichier.

Cette règle couvre notamment :

- les balises ouvrantes et fermantes ;
- les balises personnalisées ;
- les commentaires HTML ;
- les déclarations `DOCTYPE` ;
- les instructions de traitement ;
- les sections CDATA ;
- les balises SVG ;
- les balises MathML ;
- les attributs d’événement ;
- les fragments apparemment inoffensifs comme `<div>` ou `<span>`.

Le HTML brut ne doit pas être seulement échappé ou supprimé silencieusement. Le paquet doit être
refusé afin que son auteur corrige explicitement la source.

Les autoliens CommonMark entre chevrons ne sont pas considérés comme du HTML lorsqu’ils sont
analysés comme des nœuds de lien conformes.

## 12. MDX, JSX et expressions

Le pipeline ne doit installer ni activer un analyseur MDX pour les paquets distribuables.

Les nœuds correspondant notamment à :

- `mdxjsEsm` ;
- `mdxFlowExpression` ;
- `mdxTextExpression` ;
- `mdxJsxFlowElement` ;
- `mdxJsxTextElement`

doivent entraîner le rejet immédiat du fichier.

Aucun contenu Markdown ne doit pouvoir importer un module, appeler une fonction, accéder à une
variable, créer un composant ou exécuter une expression.

## 13. Images et ressources intégrées

Les nœuds `image` et `imageReference` sont interdits.

Sont également interdits :

- les balises HTML `img`, `picture`, `source` et `video` ;
- les images encodées en `data:` ;
- les pixels de suivi ;
- les images distantes ;
- les images relatives au paquet ;
- les SVG intégrés ou référencés ;
- les badges distants ;
- les aperçus automatiques d’URL.

Cette règle est cohérente avec la version initiale du contrat du paquet, qui n’autorise que le
Markdown et le manifeste JSON.

Aucune URL rencontrée dans le Markdown ne doit être préchargée afin de produire un aperçu.

## 14. Politique générale des liens

Un lien est autorisé uniquement s’il appartient à l’une des catégories suivantes :

1. lien relatif vers un fichier Markdown inventorié dans le même paquet ;
2. lien externe absolu utilisant exactement le protocole `https:`.

Tout autre lien doit être rejeté.

La validation doit être effectuée après :

- décodage HTML des caractères de référence ;
- suppression des caractères de contrôle interdits ;
- analyse par un parseur d’URL conforme ;
- normalisation du protocole en minuscules pour la comparaison ;
- vérification du chemin relatif selon le contrat du paquet.

Une comparaison par simple préfixe de chaîne est insuffisante.

## 15. Protocoles et formes d’URL interdits

Sont interdits notamment :

- `javascript:` ;
- `vbscript:` ;
- `data:` ;
- `file:` ;
- `filesystem:` ;
- `blob:` ;
- `about:` ;
- `chrome:` ;
- `resource:` ;
- `ftp:` ;
- `ws:` ;
- `wss:` ;
- `mailto:` ;
- `tel:` ;
- les URL sans protocole commençant par `//` ;
- les chemins absolus commençant par `/` ;
- les chemins Windows absolus ;
- les chemins contenant une barre oblique inversée ;
- les identifiants intégrés à une URL, comme `user:password@host` ;
- les URL contenant un caractère de contrôle ;
- les URL dont le protocole est masqué par un encodage ou des espaces.

Les variantes de casse, d’encodage ou d’espacement doivent produire le même rejet.

## 16. Liens externes HTTPS

Un lien externe HTTPS doit :

- contenir un nom d’hôte non vide ;
- ne pas contenir d’identifiant ou de mot de passe ;
- ne pas utiliser un port hors de la plage valide ;
- ne pas viser littéralement `localhost` ;
- ne pas viser un nom se terminant par `.local` ;
- ne pas utiliser une adresse IP non spécifiée, de boucle locale, privée ou de liaison locale ;
- rester informatif et non indispensable au fonctionnement du module.

Le validateur ne doit pas résoudre le DNS ni effectuer de requête réseau pour vérifier le lien.

Un lien externe doit être rendu avec :

- `target="_blank"` ;
- `rel="noopener noreferrer nofollow"`.

Ces valeurs sont ajoutées par un composant de rendu approuvé. Elles ne proviennent jamais de
l’auteur du Markdown.

L’ouverture d’un lien exige toujours une action explicite de l’utilisateur.

## 17. Liens internes

Un lien interne doit :

- utiliser un chemin relatif ;
- utiliser `/` comme séparateur ;
- viser un fichier portant l’extension `.md` ;
- rester dans la racine logique du paquet ;
- correspondre après normalisation à un fichier inventorié dans le manifeste ;
- respecter la casse exacte du chemin inventorié ;
- ne contenir ni requête ni identifiants ;
- ne contenir aucun caractère `%` ni encodage en pourcentage ;
- ne pas traverser un lien symbolique ;
- ne pas contenir de segment vide, `.` ou `..`.

Le chemin est résolu relativement au fichier Markdown contenant le lien.

Les fragments internes sont interdits dans la version initiale. Les liens comme `#section` ou
`guide.md#section` doivent être rejetés jusqu’à la définition d’un algorithme d’identifiants de
titres stable et résistant au DOM clobbering.

Un lien vers un fichier absent ou non inventorié entraîne le rejet du paquet.

## 18. Autoliens

Les autoliens CommonMark et GFM sont soumis aux mêmes règles que les liens explicites.

Un autolien HTTPS peut être accepté.

Les autoliens d’adresse électronique sont interdits dans la version initiale, car le protocole
`mailto:` n’est pas autorisé et parce qu’ils peuvent introduire des données personnelles.

Une URL textuelle que le parseur GFM transforme automatiquement en lien doit passer par le même
validateur d’URL que toute autre destination.

Le pipeline ne doit pas maintenir deux politiques d’URL différentes.

## 19. Titres et identifiants DOM

Les titres de niveaux 1 à 6 sont autorisés.

La version initiale ne génère aucun attribut `id` à partir du texte des titres.

Cette restriction évite :

- les collisions d’identifiants ;
- le DOM clobbering ;
- les divergences entre moteurs de génération de slugs ;
- l’injection de caractères ambigus dans les ancres ;
- les liens internes instables entre versions.

Une politique d’ancres pourra être ajoutée dans une version ultérieure avec un préfixe réservé et un
algorithme versionné.

## 20. Code en ligne et blocs de code

Le contenu des nœuds `inlineCode` et `code` doit toujours être traité comme du texte.

Il peut contenir, à titre d’exemple :

- du HTML ;
- du JavaScript ;
- des commandes shell ;
- des URL interdites ;
- des fragments JSON ;
- des caractères normalement interprétés par Markdown.

Ce contenu ne doit jamais :

- être exécuté ;
- être évalué ;
- être importé ;
- être rendu comme HTML ;
- être transmis automatiquement à un terminal ;
- déclencher une coloration exécutée dans le navigateur ;
- devenir un composant interactif.

Les caractères HTML doivent être échappés lors du rendu.

## 21. Information de langage des blocs de code

L’information placée après la clôture ouvrante d’un bloc de code est facultative.

Lorsqu’elle existe, elle doit :

- contenir au maximum 32 caractères ASCII ;
- commencer par une lettre ou un chiffre ;
- contenir uniquement des lettres ASCII, des chiffres, `+`, `-`, `_` ou `.` ;
- ne contenir aucun espace supplémentaire, attribut ou métadonnée.

Expression de référence :

```text
^[A-Za-z0-9][A-Za-z0-9+._-]{0,31}$
```

La valeur peut être affichée comme une simple étiquette textuelle.

Une valeur inconnue ne doit charger aucun plugin. Elle est rendue comme du code sans coloration.

## 22. Coloration syntaxique

La version initiale ne nécessite aucune coloration syntaxique.

Si une coloration est ajoutée ultérieurement :

- elle doit être effectuée par une bibliothèque approuvée et maintenue ;
- elle doit fonctionner sans évaluer le code ;
- elle doit utiliser une liste fermée de langages ;
- elle ne doit pas charger dynamiquement un module à partir de la valeur fournie par l’auteur ;
- elle doit s’exécuter avant la sanitisation finale ou produire des composants approuvés ;
- ses classes HTML doivent être explicitement ajoutées au schéma de sanitisation ;
- elle doit disposer de tests XSS et de limites de temps et de mémoire.

L’ajout d’un surligneur constitue un changement contrôlé du pipeline de sécurité.

## 23. Mermaid, diagrammes et mathématiques

Les blocs portant une information de langage comme `mermaid`, `plantuml`, `dot`, `graphviz`, `math`,
`latex` ou `tex` restent de simples blocs de code inertes.

Le pipeline ne doit :

- exécuter aucun moteur de diagramme ;
- générer aucun SVG à partir du contenu ;
- charger aucune bibliothèque Mermaid ;
- appeler aucun service PlantUML ;
- exécuter aucun moteur TeX ;
- interpréter aucune formule comme du HTML.

L’activation future d’un moteur de diagramme ou de mathématiques nécessite un contrat de sécurité,
des limites et des tests séparés.

## 24. Tableaux GFM

Les tableaux GFM sont autorisés.

Ils doivent être rendus avec les seules balises structurelles nécessaires :

- `table` ;
- `thead` ;
- `tbody` ;
- `tr` ;
- `th` ;
- `td`.

L’alignement ne doit pas introduire un attribut `style` fourni par le contenu. Il doit être traduit
par un composant approuvé ou ignoré.

Les cellules ne peuvent contenir que des nœuds en ligne déjà autorisés.

Un tableau dépassant les limites définies dans ce contrat doit être rejeté.

## 25. Listes de tâches

Les listes de tâches GFM sont autorisées comme représentation documentaire.

Elles doivent être rendues de manière statique :

- aucune case modifiable ;
- aucun formulaire ;
- aucun événement ;
- aucune modification persistée ;
- aucun attribut contrôlé par l’auteur.

L’état coché ou non coché peut être représenté par un symbole textuel ou un composant désactivé
approuvé.

Le contenu d’un module ne doit jamais transformer une liste de tâches en action administrative.

## 26. Caractères invisibles et bidirectionnels

Le validateur doit refuser hors et dans les blocs de code :

- les caractères NUL ;
- les contrôles C0, sauf tabulation horizontale et saut de ligne ;
- les contrôles C1 ;
- `U+202A` à `U+202E` ;
- `U+2066` à `U+2069` ;
- `U+200B` ;
- `U+FEFF`.

Ces caractères peuvent être documentés sous leur forme textuelle échappée, par exemple `U+202E`,
mais ne doivent pas être présents littéralement.

Une future prise en charge de langues nécessitant certains caractères de formatage devra être
définie et testée explicitement.

## 27. Métadonnées en tête de fichier

Les blocs de métadonnées ou front matter YAML et TOML sont interdits.

Les métadonnées de module appartiennent au manifeste `promptube-module.json`.

Le pipeline ne doit activer aucun plugin de front matter.

Le contrôle lexical doit rejeter :

- un fichier dont la première ligne est exactement `---` et qui contient ensuite une ligne de
  fermeture exactement égale à `---` ou `...` ;
- un fichier dont la première ligne est exactement `+++` et qui contient ensuite une ligne de
  fermeture exactement égale à `+++`.

Un objet JSON écrit au début d’un document ne doit recevoir aucun traitement spécial. Il reste du
texte Markdown ou du code clôturé et ne devient jamais une source de métadonnées.

## 28. Pipeline de traitement prévu

Le pipeline initial suit cet ordre :

1. vérifier le fichier et son chemin selon le contrat du paquet ;
2. vérifier sa taille compressée et décompressée ;
3. calculer et vérifier son empreinte sur les octets originaux ;
4. décoder strictement l’UTF-8 ;
5. vérifier le BOM, les fins de ligne et les caractères interdits ;
6. appliquer les limites lexicales ;
7. détecter les métadonnées interdites ;
8. analyser avec CommonMark et les seules extensions GFM approuvées ;
9. compter et valider tous les nœuds de l’AST Markdown ;
10. valider chaque destination de lien ;
11. réconcilier les liens internes avec l’inventaire du manifeste ;
12. convertir l’AST Markdown vers un AST HTML sans HTML dangereux ;
13. appliquer une sanitisation par schéma fermé ;
14. vérifier qu’aucun élément attendu n’a été supprimé par la sanitisation ;
15. produire un rapport de validation ;
16. autoriser le rendu uniquement lorsque tous les contrôles ont réussi.

Aucune étape ne doit effectuer un accès réseau ou exécuter le contenu.

## 29. Analyse Markdown

L’analyseur doit être configuré avec :

- la syntaxe CommonMark retenue ;
- les seules extensions GFM nécessaires ;
- aucun parseur HTML actif ;
- aucun parseur MDX ;
- aucun plugin de directives ;
- aucun plugin de front matter ;
- aucun plugin mathématique ;
- aucun plugin de diagramme.

La bibliothèque exacte et sa version seront fixées pendant l’implémentation.

L’ensemble de plugins doit être déclaré explicitement dans le code. Il ne doit pas être construit à
partir du contenu du paquet ou d’une configuration fournie par celui-ci.

## 30. Validation de l’AST Markdown

La validation de l’AST doit :

- parcourir chaque nœud une seule fois ou selon une complexité bornée ;
- vérifier le type de chaque nœud ;
- vérifier les propriétés autorisées pour ce type ;
- refuser les propriétés inconnues capables d’influencer le rendu ;
- compter les nœuds, liens, tableaux et profondeurs ;
- vérifier les valeurs de code fence ;
- valider toutes les destinations, y compris celles des définitions ;
- détecter les définitions dupliquées ambiguës ;
- refuser les références non résolues lorsque leur intention est un lien ;
- produire l’emplacement de l’erreur sans recopier un contenu sensible complet.

Un plugin ne doit pas pouvoir ajouter après cette étape un nœud ou un attribut contrôlé par
l’auteur.

## 31. Conversion vers l’AST HTML

La conversion doit être effectuée sans l’option `allowDangerousHtml`.

Les nœuds HTML bruts ne doivent pas être transmis à l’AST HTML.

Les mécanismes suivants sont interdits :

- `allowDangerousHtml: true` ;
- l’insertion directe par `dangerouslySetInnerHTML` d’une chaîne non sanitée ;
- les gestionnaires personnalisés construits à partir du contenu ;
- les propriétés `hName`, `hProperties` ou `hChildren` non approuvées ;
- l’ajout d’attributs arbitraires après validation.

Les composants de rendu doivent correspondre à une liste fermée maintenue dans l’application.

## 32. Schéma de sanitisation

Une sanitisation reste obligatoire même lorsque le HTML brut est interdit.

Le schéma initial peut autoriser uniquement les éléments produits par les syntaxes acceptées :

- `a` ;
- `blockquote` ;
- `br` ;
- `code` ;
- `del` ;
- `em` ;
- `h1` à `h6` ;
- `hr` ;
- `li` ;
- `ol` ;
- `p` ;
- `pre` ;
- `strong` ;
- `table` ;
- `tbody` ;
- `td` ;
- `th` ;
- `thead` ;
- `tr` ;
- `ul`.

Tout autre élément doit être absent du résultat.

Les attributs provenant du contenu sont interdits, à l’exception de :

- `href` et `title` sur `a`, après validation de l’URL ;
- `start` sur `ol`, lorsqu’il s’agit d’un entier compris entre 0 et 10 000 ;
- `colSpan` et `rowSpan` sur les cellules uniquement si le convertisseur approuvé les produit et si
  leurs valeurs sont bornées.

La version initiale peut choisir de ne pas autoriser `colSpan` et `rowSpan`.

Aucun attribut `style`, `class`, `id`, `name`, `src`, `srcset`, `on*` ou `data-*` provenant du
contenu n’est autorisé.

## 33. Échec de la sanitisation

La sanitisation ne doit pas devenir un mécanisme silencieux de correction.

Après conversion et sanitisation :

- si un élément ou attribut non attendu a été supprimé ;
- si une URL a été réécrite de manière inattendue ;
- si la structure ne correspond plus au contenu validé ;
- si le sanitizer échoue ;
- si une divergence serveur/client est détectée,

le fichier doit être rejeté.

Si la normalisation du résultat sanitisé échoue parce que le sanitizer a supprimé ou réécrit une
propriété attendue, l’erreur doit être `MARKDOWN_SANITIZATION_MISMATCH`, sans document partiel.

Cette règle permet de détecter une erreur de pipeline, un plugin dangereux ou un contournement de la
validation AST.

## 34. Rendu React ou HTML

Le rendu doit préférer des composants structurés à l’insertion d’une chaîne HTML.

Chaque composant doit :

- ignorer les propriétés inconnues ;
- ne pas propager arbitrairement toutes les propriétés d’un nœud ;
- appliquer les attributs de sécurité définis par le contrat ;
- ne pas créer de gestionnaire d’événement à partir du contenu ;
- ne pas charger de ressource distante ;
- ne pas modifier la source validée ;
- produire le même résultat logique côté serveur et côté client.

Si une chaîne HTML est exceptionnellement produite, elle doit provenir de l’AST sanité et ne doit
subir aucune modification non approuvée avant son insertion.

## 35. Content Security Policy

Une Content Security Policy restrictive doit compléter le pipeline lors de l’implémentation du
rendu.

Elle ne remplace ni la validation AST ni la sanitisation.

La politique cible devra notamment éviter :

- les scripts en ligne ;
- l’évaluation dynamique ;
- les objets intégrés ;
- les cadres non approuvés ;
- les sources d’images distantes non nécessaires ;
- les chargements depuis des origines inconnues.

La valeur exacte de la CSP appartient à la phase d’intégration applicative et doit rester cohérente
avec les en-têtes de sécurité déjà définis par l’application.

## 36. Absence d’accès réseau

La validation, la prévisualisation et le rendu initial doivent fonctionner hors réseau.

Le pipeline ne doit jamais :

- vérifier automatiquement qu’un lien externe répond ;
- résoudre le DNS d’un lien ;
- produire un aperçu Open Graph ;
- télécharger une image ;
- télécharger une police ;
- télécharger un script ;
- appeler un moteur de diagramme distant ;
- suivre une redirection ;
- transmettre le contenu à un service tiers.

Seul un clic explicite de l’utilisateur peut ouvrir un lien externe après son rendu sécurisé.

## 37. Limites initiales

Les limites suivantes complètent celles du contrat du paquet :

| Élément                                    | Limite initiale |
| ------------------------------------------ | --------------- |
| Taille d’un fichier Markdown               | 1 Mio           |
| Longueur d’une ligne                       | 32 Kio          |
| Nombre de nœuds AST                        | 25 000          |
| Profondeur de nœuds                        | 16              |
| Nombre total de liens                      | 1 000           |
| Nombre de définitions de liens             | 1 000           |
| Taille d’un bloc de code                   | 256 Kio         |
| Nombre de tableaux                         | 100             |
| Nombre de lignes par tableau               | 500             |
| Nombre de colonnes par tableau             | 32              |
| Nombre total de cellules par fichier       | 10 000          |
| Longueur d’une destination de lien         | 2 048 octets    |
| Longueur d’un titre de lien                | 256 caractères  |
| Longueur d’une information de bloc de code | 32 caractères   |

Ces limites sont des fondations de conception à confirmer par des tests représentatifs.

Le dépassement d’une limite entraîne un rejet avant le rendu.

## 38. Limites de temps et de ressources

Le validateur Markdown par fichier dispose :

- d’une limite de temps par fichier ;
- d’une limite mémoire ;
- d’un mécanisme d’interruption ;
- d’un compteur de nœuds et de profondeur pendant l’analyse ;
- d’une protection contre les expressions régulières catastrophiques ;
- de mesures permettant de confirmer les limites sur le matériel cible.

Le futur orchestrateur de validation des paquets devra imposer une limite de temps cumulée par
paquet et interrompre le traitement global lorsque cette limite sera dépassée. Cette responsabilité
n’est pas implémentée dans le validateur Markdown par fichier de la présente phase.

La valeur cible initiale pour l’analyse et la validation d’un fichier de taille maximale est de deux
secondes dans un environnement isolé représentatif.

Les valeurs opérationnelles provisoires validées le 31 juillet 2026 sont :

- délai parent par fichier : `2 500 ms` ;
- ancien espace mémoire V8 du worker : `64 Mio` ;
- jeune espace mémoire V8 du worker : `16 Mio` ;
- pile V8 du worker : `4 Mio` ;
- concurrence maximale : `2` workers ;
- validations maximales en attente : `8` ;
- délai maximal d’attente dans la file FIFO : `2 500 ms` ;
- terminaison systématique du worker après succès, rejet, timeout, annulation, crash ou message
  invalide.

Une saturation, une expiration ou une annulation de la file doit produire `MARKDOWN_RESOURCE_LIMIT`,
sans création de worker ni waiter orphelin.

Le worker TypeScript est exécuté réellement par Node.js 24. Sa présence et ses dépendances runtime
sont incluses dans l’artefact Next.js standalone par le traçage de sortie explicite.

Le parent valide récursivement la forme fermée du message, recalcule le SHA-256 des octets
originaux, reconstruit un nouveau résultat et le gèle profondément. Une sortie avant message ou un
échec de `worker.terminate()` produit `MARKDOWN_DEPENDENCY_FAILURE` et `document: null`.

Cette valeur doit être confirmée avant le passage du contrat à `APPROVED`.

## 39. Dépendances et plugins

Toute dépendance du pipeline Markdown doit :

- être nécessaire ;
- être maintenue ;
- disposer d’une licence compatible ;
- être verrouillée dans le fichier de dépendances ;
- être couverte par les audits de sécurité ;
- être mise à jour de manière contrôlée ;
- être testée avec les scénarios de ce contrat ;
- fonctionner sans accès réseau pendant la validation ;
- ne pas charger de plugin dynamiquement.

Une mise à jour majeure de l’analyseur, du convertisseur, du sanitizer ou du moteur de rendu doit
déclencher une nouvelle exécution de la suite complète de fixtures Markdown.

La pile initiale verrouillée est :

| Responsabilité        | Dépendance        | Version  |
| --------------------- | ----------------- | -------- |
| Orchestration         | `unified`         | `11.0.5` |
| Analyse CommonMark    | `remark-parse`    | `11.0.0` |
| Extensions GFM        | `remark-gfm`      | `4.0.1`  |
| Projection MDAST/HAST | `remark-rehype`   | `11.1.2` |
| Sanitisation          | `rehype-sanitize` | `6.0.0`  |
| Classification IP     | `ipaddr.js`       | `2.4.0`  |

`remark-gfm` utilise `singleTilde: false`. Aucun `rehype-raw`, parseur MDX, plugin dynamique,
surligneur, moteur de diagramme ou moteur mathématique n’est activé.

## 40. Validation côté serveur et côté client

La décision d’accepter ou de refuser un fichier appartient au serveur ou au pipeline de validation
de confiance.

Le client ne doit jamais être l’unique autorité de validation.

Une prévisualisation côté client :

- utilise les mêmes règles ;
- ne transforme pas un rejet serveur en acceptation ;
- ne publie rien ;
- ne stocke pas une version approuvée ;
- ne masque pas les erreurs ;
- ne charge aucune ressource externe automatiquement.

Une divergence entre les deux environnements doit bloquer la publication.

L’API serveur initiale est :

```ts
validateSecureMarkdown({
  bytes,
  path,
  manifestFiles,
  correlationId,
  signal,
}): Promise<MarkdownValidationResult>
```

Un résultat valide contient un rapport et un `ValidatedMarkdownDocument`. Un résultat invalide
contient un rapport et `document: null`. Aucun HAST brut, parseur, sanitizer, horloge ou politique
d’URL n’est configurable par l’appelant. Le futur rendu devra consommer le DTO validé sans reparser
la source Markdown.

Avant toute copie d’octets ou de collection, l’entrée publique est contrôlée à l’exécution. Les
octets sont bornés à `1 MiB`, l’inventaire `manifestFiles` est borné à 200 chemins denses, et le
chemin principal comme l’identifiant de corrélation sont bornés avant création du worker.

Les messages du worker sont ensuite validés comme des données non fiables : clés, versions,
métriques, erreurs, empreintes, chemin, corrélation, tags, propriétés, profondeur, nœuds et langages
de code doivent tous respecter le contrat fermé. Les collections issues du worker doivent être de
vrais tableaux denses et bornés avant toute reconstruction. Le SHA-256 du rapport, celui du document
et celui recalculé par le parent doivent être identiques.

## 41. Rapport de validation

Le rapport doit contenir au minimum :

- l’identifiant du contrôle ;
- la version du contrat Markdown ;
- la version du pipeline ;
- le chemin du fichier ;
- l’empreinte du fichier ;
- le verdict ;
- les codes d’erreur ;
- les emplacements concernés ;
- les limites mesurées ;
- la date de validation ;
- l’identifiant de corrélation ;
- les versions des dépendances critiques.

Le rapport ne doit pas recopier :

- un secret ;
- un jeton ;
- une donnée personnelle réelle ;
- l’intégralité d’un fichier ;
- une URL signée ;
- un chemin local de l’opérateur ;
- une trace contenant des détails internes inutiles.

## 42. Verdicts et codes initiaux

Un fichier reçoit un verdict :

- `MARKDOWN_VALID` ;
- `MARKDOWN_INVALID`.

Les codes d’erreur initiaux sont :

- `MARKDOWN_INVALID_ENCODING` ;
- `MARKDOWN_BOM_FORBIDDEN` ;
- `MARKDOWN_INVALID_LINE_ENDING` ;
- `MARKDOWN_FORBIDDEN_CHARACTER` ;
- `MARKDOWN_LIMIT_EXCEEDED` ;
- `MARKDOWN_FRONT_MATTER_FORBIDDEN` ;
- `MARKDOWN_FORBIDDEN_SYNTAX` ;
- `MARKDOWN_FORBIDDEN_NODE` ;
- `MARKDOWN_FORBIDDEN_PROPERTY` ;
- `MARKDOWN_HTML_FORBIDDEN` ;
- `MARKDOWN_IMAGE_FORBIDDEN` ;
- `MARKDOWN_MDX_FORBIDDEN` ;
- `MARKDOWN_UNSAFE_URL` ;
- `MARKDOWN_INTERNAL_LINK_INVALID` ;
- `MARKDOWN_INTERNAL_LINK_MISSING` ;
- `MARKDOWN_SANITIZATION_MISMATCH` ;
- `MARKDOWN_RENDER_FAILURE` ;
- `MARKDOWN_RESOURCE_LIMIT` ;
- `MARKDOWN_DEPENDENCY_FAILURE`.

Un seul fichier invalide rend le paquet inadmissible à la publication.

## 43. Scénarios obligatoires d’acceptation

La future suite de tests doit accepter au minimum :

1. un document CommonMark simple ;
2. des titres de niveaux 1 à 6 ;
3. des emphases et du texte barré ;
4. des listes ordonnées et non ordonnées ;
5. une liste de tâches rendue statiquement ;
6. un tableau GFM dans les limites ;
7. un lien HTTPS valide ;
8. un autolien HTTPS valide ;
9. un lien relatif vers un fichier Markdown inventorié ;
10. une définition de lien valide ;
11. un bloc de code contenant littéralement `<script>` ;
12. un bloc de code contenant `javascript:alert(1)` ;
13. un bloc `mermaid` rendu comme texte inerte ;
14. des caractères français UTF-8 valides ;
15. un document proche des limites sans les dépasser.

Chaque acceptation doit vérifier l’AST, le résultat sanité et l’absence d’accès réseau.

Les 15 scénarios disposent de tests d’intégration explicitement nommés depuis le 31 juillet 2026.

## 44. Scénarios obligatoires de rejet

La future suite de tests doit rejeter au minimum :

1. un fichier UTF-8 invalide ;
2. un fichier avec BOM ;
3. un fichier contenant NUL ;
4. un fichier contenant un contrôle bidirectionnel interdit ;
5. un front matter YAML ;
6. un front matter TOML ;
7. une balise HTML simple ;
8. un commentaire HTML ;
9. une balise `script` ;
10. un attribut d’événement ;
11. un fragment SVG ;
12. un fragment MathML ;
13. une image Markdown ;
14. une image par référence ;
15. une image `data:` ;
16. un composant MDX ;
17. une expression MDX ;
18. un import ou export MDX ;
19. un lien `javascript:` ;
20. un lien `data:` ;
21. un lien `file:` ;
22. un lien `mailto:` ;
23. une URL HTTPS contenant des identifiants ;
24. une URL sans protocole commençant par `//` ;
25. un lien vers `localhost` ;
26. un lien vers une adresse privée littérale ;
27. un lien relatif contenant `..` ;
28. un lien relatif absolu ;
29. un lien relatif avec une barre oblique inversée ;
30. un lien relatif contenant un encodage en pourcentage ;
31. un lien interne absent du manifeste ;
32. un lien interne avec fragment ;
33. un nœud AST inconnu ;
34. une propriété `data.hName` injectée ;
35. un attribut supprimé par le sanitizer ;
36. une profondeur excessive ;
37. un nombre excessif de nœuds ;
38. un bloc de code trop volumineux ;
39. un tableau dépassant les limites ;
40. une destination de lien trop longue ;
41. une tentative d’accès réseau par un plugin ;
42. une divergence entre le rendu serveur et le rendu client.

Les variantes d’encodage et de casse des protocoles dangereux doivent également être testées.

Les 15 acceptations sur 15 et 41 rejets sur 42 disposent de tests exécutables explicitement nommés.
Le scénario 42 reste présent comme test `todo` : il sera activé dans la future branche de rendu
React afin de vérifier une divergence réelle entre rendu serveur et rendu client.

## 45. Parcours manuel prévu

Le parcours produit reste :

1. construire manuellement le dossier du module ;
2. rédiger les fichiers Markdown ;
3. vérifier localement le contenu ;
4. générer le manifeste ;
5. calculer les tailles et empreintes ;
6. construire l’archive ZIP privée ;
7. importer l’archive depuis l’administration ;
8. valider l’archive et le manifeste ;
9. valider chaque fichier Markdown ;
10. examiner le rapport ;
11. corriger le dossier source en cas d’échec ;
12. reconstruire une nouvelle archive ;
13. approuver et publier uniquement après réussite de tous les contrôles.

Le validateur ne modifie pas automatiquement le module source.

## 46. Versionnage et immutabilité

La version du présent contrat est indépendante :

- de la version du module ;
- de la version du manifeste ;
- de la version de l’application ;
- de la version du schéma JSON.

Toute modification de la syntaxe autorisée, de la politique d’URL, du schéma de sanitisation ou des
limites doit être versionnée.

Une version de module publiée reste associée :

- à la version du contrat Markdown utilisée ;
- à la version du pipeline ;
- aux versions des dépendances critiques ;
- au rapport de validation correspondant.

Une nouvelle règle ne doit pas modifier silencieusement le rendu historique d’un artefact immuable.

## 47. Sécurité opérationnelle

Les échecs répétés de validation doivent pouvoir être audités sans journaliser le contenu complet.

Le système doit :

- associer les erreurs à un identifiant de corrélation ;
- limiter le nombre de validations concurrentes ;
- isoler les traitements lourds ;
- empêcher un paquet de contrôler les options du validateur ;
- maintenir les dépendances de sécurité ;
- permettre de désactiver la prévisualisation en cas d’incident ;
- conserver les rapports nécessaires à l’audit ;
- distinguer un rejet utilisateur d’une défaillance interne.

Une défaillance interne ne doit jamais produire un verdict valide.

## 48. Hors périmètre de cette version

Le présent document et l’implémentation serveur associée ne créent pas encore :

- une route applicative appelant le validateur ;
- le composant React de rendu ;
- la prévisualisation dans l’administration ;
- la Content Security Policy définitive ;
- le stockage privé ;
- l’upload d’archives ;
- le lecteur ZIP sécurisé ;
- le générateur de manifestes ;
- les modules distribuables réels ;
- la coloration syntaxique ;
- le rendu Mermaid ;
- le rendu mathématique ;
- les images ;
- les pièces jointes ;
- les aperçus de liens ;
- la vérification réseau des liens ;
- l’export PDF ;
- la publication commerciale.

Ces éléments nécessitent des phases de conception, d’implémentation et de validation séparées.

## 49. Décisions différées

Les décisions suivantes restent ouvertes :

- bibliothèque exacte de rendu ;
- valeurs définitives des limites de ressources ;
- stratégie de comparaison du rendu serveur et client ;
- politique future des ancres de titres ;
- politique future des liens vers des fragments ;
- liste future des langages de coloration ;
- politique future des diagrammes ;
- politique future des mathématiques ;
- prise en charge future des images ;
- politique d’accessibilité du composant de rendu ;
- Content Security Policy définitive ;
- politique de migration des anciens modules ;
- codes définitifs du rapport de validation.

Aucune décision différée ne doit être intégrée silencieusement à l’implémentation.

## 50. Critères de passage en revue

Le contrat peut passer de `DRAFT` à `IN_REVIEW` lorsque :

- les syntaxes autorisées et interdites sont explicites ;
- la politique HTML est sans ambiguïté ;
- la politique MDX est sans ambiguïté ;
- la politique des images est cohérente avec le contrat du paquet ;
- les protocoles autorisés sont définis ;
- les liens internes sont réconciliables avec le manifeste ;
- les blocs de code restent inertes ;
- la liste positive de nœuds Markdown est définie ;
- la liste positive d’éléments HTML est définie ;
- l’ordre du pipeline est défini ;
- les limites initiales sont mesurables ;
- les verdicts sont définis ;
- les scénarios d’acceptation et de rejet sont complets ;
- les décisions différées sont visibles ;
- le document est formaté et versionné.

## 51. Critères d’approbation

Le contrat peut passer à `APPROVED` lorsque :

- le propriétaire valide ses fondations ;
- le pipeline est implémenté sans `allowDangerousHtml` ;
- un schéma fermé de sanitisation est implémenté ;
- les liens sont validés par une fonction unique ;
- les liens internes sont vérifiés contre un manifeste réel ;
- les limites sont confirmées sur des fichiers représentatifs ;
- les tests d’acceptation réussissent ;
- les scénarios de rejet sont effectivement refusés ;
- les variantes de protocoles dangereux sont refusées ;
- les nœuds et propriétés injectés par des plugins sont refusés ;
- la sanitisation ne masque aucun échec ;
- aucun test ne provoque d’accès réseau ;
- le rendu serveur et le rendu client sont cohérents ;
- les dépendances critiques sont auditées ;
- le pipeline complet réussit sur les trois modules initiaux ;
- aucune décision différée bloquante ne subsiste.
