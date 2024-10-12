
# DDAI-MS-Telegram Bot

## Descrizione
**DDAI-MS-Telegram Bot** è un bot Telegram integrato con la piattaforma DEDO e ChatGPT (GPT-4) che permette agli utenti di interagire con i topic del canale Telegram principale e caricare immagini relative alle **Call for Data (C4D)**. Gli utenti ricevono remunerazione in **DEDO Token** per i dataset caricati e validati. Il bot utilizza AWS per la gestione delle chiavi segrete e l'archiviazione delle immagini su S3.

## Funzionalità principali
- Gestione delle interazioni con gli utenti Telegram.
- Caricamento delle immagini e validazione tramite ChatGPT (OpenAI).
- Archiviazione delle immagini caricate su **Amazon S3**.
- Remunerazione degli utenti in **DEDO Token**.
- Notifiche cicliche tramite cron job per sollecitare il caricamento di dati.

## Requisiti
- **Node.js** (versione >= 14)
- **PostgreSQL** per la gestione dei dati utente e delle C4D.
- **AWS S3** per l'archiviazione dei file.
- **OpenAI API** per la validazione delle immagini.
- **Kubernetes** per la gestione del deploy del bot con **ConfigMap** e **Secret**.
- **Helm** per la gestione del deploy su Kubernetes.

## Installazione

### 1. Clonare il repository

```bash
git clone https://github.com/tuo-repository/ddai-ms-telegram.git
cd ddai-ms-telegram
```

### 2. Installare le dipendenze

```bash
npm install
```

### 3. Configurare **AWS Secrets Manager** e **ConfigMap**

Tutte le variabili di configurazione e le chiavi sensibili sono gestite tramite **AWS Secrets Manager** e **Kubernetes ConfigMap**.

#### ConfigMap
Crea una **ConfigMap** su Kubernetes con le seguenti variabili non sensibili:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ddai-ms-telegram
  namespace: default
data:
  DB_URL: "postgres://user:password@localhost:5432/dedo"
  BUCKET_S3: "your_s3_bucket"
  REM_DELAY: "43200"
```

Applica la ConfigMap:

```bash
kubectl apply -f configmap-ddai-ms-telegram.yaml
```

#### Secret
Crea un **Secret** su Kubernetes per le chiavi AWS:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: aws-credentials
  namespace: default
type: Opaque
data:
  AWS_KEY: your_aws_key_base64_encoded
  AWS_SECRET: your_aws_secret_base64_encoded
```

Applica il Secret:

```bash
kubectl apply -f secret-aws.yaml
```

### 4. Modificare i file **Helm**

Aggiorna il file **values.yaml** e **deployment.yaml** come descritto nella documentazione per includere **ConfigMap** e **Secret** nel deployment del bot.

### 5. Deployment su Kubernetes

Assicurati che Kubernetes sia configurato correttamente e poi installa o aggiorna il chart Helm:

```bash
helm upgrade --install ddai-ms-telegram ./path/to/your/helm/chart
```

## Utilizzo

Dopo il deployment, il bot sarà attivo su Telegram. Puoi interagire con il bot nel canale configurato e caricare immagini relative alle **Call for Data (C4D)**.

### Funzionalità del bot
- Il bot risponde ai messaggi degli utenti.
- Invita a caricare immagini per partecipare alla C4D.
- Carica e valida le immagini tramite ChatGPT (OpenAI).
- Memorizza le immagini su AWS S3 e aggiorna i record nel database PostgreSQL.
- Invia notifiche periodiche per sollecitare il caricamento di nuovi dati.

## Variabili d'ambiente
Le seguenti variabili sono gestite tramite **AWS Secrets Manager** e **Kubernetes ConfigMap**:

- **DB_URL**: URL per la connessione a PostgreSQL.
- **BUCKET_S3**: Nome del bucket S3 su AWS per il caricamento dei file.
- **REM_DELAY**: Intervallo in secondi per i promemoria ciclici (predefinito: 43200).
- **AWS_KEY**: Chiave di accesso AWS.
- **AWS_SECRET**: Chiave segreta AWS.

## Cron Job per notifiche

Il bot esegue un cron job ogni 15 minuti per controllare le C4D attive e inviare promemoria agli utenti.

### Esempio di cron job:
```bash
cron.schedule('*/15 * * * *', async () => {
  // Funzionalità per inviare promemoria agli utenti
});
```

## Tecnologie utilizzate
- **Node.js**: Backend del bot.
- **PostgreSQL**: Database per memorizzare utenti, C4D e dataset.
- **AWS S3**: Archiviazione delle immagini.
- **OpenAI GPT-4**: Validazione delle immagini.
- **Kubernetes**: Deployment del bot.
- **Helm**: Gestione dei deployment e configurazioni.

## Contribuire

Se desideri contribuire a questo progetto, crea una pull request o apri un issue su GitHub. Sei libero di migliorare il codice e aggiungere nuove funzionalità.

---

### Autore
Ivan Di Lelio

### Licenza
Questo progetto è distribuito sotto la licenza MIT. Vedi il file `LICENSE` per ulteriori dettagli.
