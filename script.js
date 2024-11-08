const fromText = document.querySelector(".from-text"),
    toText = document.querySelector(".to-text"),
    exchangeIcon = document.querySelector(".exchange"),
    selectTag = document.querySelectorAll("select"),
    icons = document.querySelectorAll(".row i"),
    translateBtn = document.querySelector("#translateTextBtn"),
    fileInput = document.querySelector("#fileInput"),
    translateFileBtn = document.querySelector("#translateFileBtn");

let speechSynthesisUtterance;

const MAX_WORD_COUNT = 850;

function createOptions(id, country_code) {
    let selected = (id === 0 && country_code === "en-GB") || (id === 1 && country_code === "hi-IN") ? "selected" : "";
    return `<option ${selected} value="${country_code}">${countries[country_code]}</option>`;
}

selectTag.forEach((tag, id) => {
    for (let country_code in countries) {
        tag.insertAdjacentHTML("beforeend", createOptions(id, country_code));
    }
});

exchangeIcon.addEventListener("click", () => {
    [fromText.value, toText.value] = [toText.value, fromText.value];
    [selectTag[0].value, selectTag[1].value] = [selectTag[1].value, selectTag[0].value];
});

fromText.addEventListener("input", () => {
    if (!fromText.value) {
        toText.value = "";
    }
});

async function translateText() {
    let text = fromText.value.trim(),
        translateFrom = selectTag[0].value,
        translateTo = selectTag[1].value;

    const wordCount = text.split(/\s+/).filter(word => word).length;
    if (wordCount > MAX_WORD_COUNT) {
        alert(`Word count exceeds the limit of ${MAX_WORD_COUNT} words.`);
        return;
    }

    toText.setAttribute("placeholder", "Translating...");

    try {
        const translatedText = await translateChunks(text, translateFrom, translateTo);
        toText.value = translatedText;
        toText.setAttribute("placeholder", "Translation");
    } catch (error) {
        console.error(error);
        alert("An error occurred during translation.");
    }
}

async function translateChunks(text, translateFrom, translateTo) {
    const chunkSize = 500;
    const chunks = Array.from({ length: Math.ceil(text.length / chunkSize) }, (_, index) =>
        text.substr(index * chunkSize, chunkSize)
    );

    const translatedChunks = await Promise.all(chunks.map(chunk => translateChunkWithMyMemoryAPI(chunk, translateFrom, translateTo)));
    return translatedChunks.join('');
}

function translateChunkWithMyMemoryAPI(chunk, translateFrom, translateTo) {
    const apiUrl = 'https://api.mymemory.translated.net/get';

    return new Promise((resolve, reject) => {
        const url = `${apiUrl}?q=${encodeURIComponent(chunk)}&langpair=${translateFrom}|${translateTo}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.responseStatus === 200) {
                    const translatedText = data.matches[0].translation;
                    resolve(translatedText);
                } else {
                    reject(new Error(`MyMemory API error: ${data.responseDetails}`));
                }
            })
            .catch(reject);
    });
}

translateBtn.addEventListener("click", translateText);

function translateFile() {
    const file = fileInput.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
        const fileContent = event.target.result;

        const wordCount = fileContent.split(/\s+/).filter(word => word).length;
        if (wordCount > MAX_WORD_COUNT) {
            alert(`Word count exceeds the limit of ${MAX_WORD_COUNT} words.`);
            return;
        }

        translateTextForFile(fileContent, (translatedText) => {
            downloadFile(translatedText, "translated_text.txt");
        });
    };

    reader.readAsText(file);
}

translateFileBtn.addEventListener("click", translateFile);

function translateTextForFile(text, callback) {
    let translateFrom = selectTag[0].value,
        translateTo = selectTag[1].value;
    if (!text) return;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${translateFrom}|${translateTo}`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.responseStatus === 200) {
                const translatedText = data.matches[0].translation;
                callback(translatedText);
            } else {
                console.error(`MyMemory API error: ${data.responseDetails}`);
                alert("An error occurred during translation.");
            }
        })
        .catch(error => {
            console.error(error);
            alert("An error occurred during translation.");
        });
}

function downloadFile(content, fileName) {
    const blob = new Blob([content], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

icons.forEach((icon) => {
    let clickCount = 0;
    let timeout;

    icon.addEventListener("click", ({ target }) => {
        if (!fromText.value || !toText.value) return;

        if (target.classList.contains("fa-copy")) {
            let selectedText = target.id === "from" ? fromText.value : toText.value;
            navigator.clipboard.writeText(selectedText);
        } else {
            if (clickCount === 0) {
                clickCount++;
                timeout = setTimeout(() => {
                    clickCount = 0;
                    let utterance;
                    if (target.id === "from") {
                        utterance = new SpeechSynthesisUtterance(fromText.value);
                        utterance.lang = selectTag[0].value;
                    } else {
                        utterance = new SpeechSynthesisUtterance(toText.value);
                        utterance.lang = selectTag[1].value;
                    }
                    speechSynthesis.speak(utterance);
                }, 200);
            } else {
                clearTimeout(timeout);
                clickCount = 0;
                if (speechSynthesisUtterance && speechSynthesisUtterance.speaking) {
                    speechSynthesisUtterance.onend = () => {
                        speechSynthesis.cancel();
                    };
                }
            }
        }
    });
});