<?php
/**
 * Dates déjà (en partie) réservées, pour le calendrier public.
 *
 * Renvoie un tableau `[{ date, essai, linkedDates }]` des événements réservés à
 * venir. `linkedDates` liste les journées LIÉES à l'événement (même dossier,
 * devis/factures non dupliqués) : elles doivent être bloquées au même titre que
 * la date principale. Elles sont rangées dans le blob `DEVIS` (`$.linkedDates`).
 *
 * NB : ce fichier existe déjà sur le serveur (avec des identifiants en dur). On
 * le verse ici SANS identifiant, en réutilisant `ccb_db()` de `configsite.php`
 * (même base que getccbdata.php), pour ne rien exposer dans le dépôt public.
 */
$cfg = __DIR__ . '/configsite.php';
if (!file_exists($cfg)) { $cfg = __DIR__ . '/config.php'; }
require $cfg;
ccb_cors();
header('Content-Type: application/json; charset=utf-8');

try {
  $bdd = ccb_db();
  $req = $bdd->query(
    "SELECT
        `date`,
        JSON_UNQUOTE(JSON_EXTRACT(`ESSAI`, '$.date')) AS essai,
        `DEVIS` AS devis
     FROM `cloeplanning`
     WHERE (`STATUT` = 'reserve' OR `STATUT` = 'autre' OR `STATUT` = 'persofull')
       AND STR_TO_DATE(`DATE`, '%d/%m/%Y') >= CURDATE()
     ORDER BY STR_TO_DATE(`DATE`, '%d/%m/%Y') ASC"
  );

  $out = [];
  while ($row = $req->fetch(PDO::FETCH_ASSOC)) {
    // Dates liées, rangées dans le blob DEVIS (format jj/mm/aaaa). Décodage
    // tolérant : un DEVIS vide ou sans `linkedDates` donne simplement [].
    $linked = [];
    if (!empty($row['devis'])) {
      $devis = json_decode($row['devis'], true);
      if (!empty($devis['linkedDates']) && is_array($devis['linkedDates'])) {
        $linked = array_values($devis['linkedDates']);
      }
    }
    $out[] = [
      'date' => $row['date'],
      'essai' => $row['essai'] ?? '',
      'linkedDates' => $linked,
    ];
  }
  $req->closeCursor();

  echo json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
