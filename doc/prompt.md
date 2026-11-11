
ce projet serait de recuperer les ecrans flow et flows du projet d emappeer fhir (voir) /Users/admin/data/oie-ws/oie-fhir-profile-mapper-plugin/README.md)
pour en faire un plugin dédié.


on a 2 ecrans:

ui dans menu monitor (car cela semble compliqué de ajouter a dashboard sans bidouille)
-idée de nom : Flows Monitoring

ui dans menu design , pour un channel 
-idée de nom : channel flow 


les ecrans dans le projet mapper ont étés "vibe-codé" rapidement mais il fautt faire quelque chose de plus "construit" et plus réfléchi qui s'integre dans le plugin web-admin oie sans hack douteux. le plugin devra aussi compatible avec le plugin RBAC de oie


peux tu initier ce projet 
- avec un repertoire demo comme dans mapper et les plugins pré requis préchargés et préconfiguré par un init
- avec des exemples propres pour montrer l'apport ergonomique
- avec des données pré chargés pour les compteurs (jouées par l'init qui chargera ls channels)

le code doit etre simple a lire pour un humain et comprehensible. tu evitera les fichiesd monilithique ou les css embarqué incomprehensible. les styles graphiques doivent etre homogène et cohérent entre eux

pour le channel channel flow , l'usage des zoom, vues differentes devra etre fluide au trackpad (usage de 2 doigts pour deplacer et zoomer) et a la souris molette + clavier

des petites aides contextuelles sont les bienvennues si necessaire a la comprehension

l'ui sera ne anglais mais i18n devra être prevu pour de futur traduction


prepare le plan.md





