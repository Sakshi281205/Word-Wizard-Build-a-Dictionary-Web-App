class DictionaryApp {
    constructor() {
        this.apiBaseUrl = 'https://api.dictionaryapi.dev/api/v2/entries/en';
        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.searchSuggestions = document.getElementById('searchSuggestions');
        this.resultsContainer = document.getElementById('resultsContainer');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.errorMessage = document.getElementById('errorMessage');
        this.wordResults = document.getElementById('wordResults');
        
        this.debounceTimer = null;
        this.currentAudio = null;
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Search button click
        this.searchBtn.addEventListener('click', () => {
            this.searchWord();
        });

        // Enter key press
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchWord();
            }
        });

        // Input for suggestions
        this.searchInput.addEventListener('input', (e) => {
            this.handleInputChange(e.target.value);
        });

        // Click outside to close suggestions
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideSuggestions();
            }
        });

        // Focus on search input
        this.searchInput.addEventListener('focus', () => {
            if (this.searchInput.value.trim()) {
                this.showSuggestions();
            }
        });
    }

    handleInputChange(value) {
        clearTimeout(this.debounceTimer);
        
        if (value.trim().length === 0) {
            this.hideSuggestions();
            this.clearResults();
            return;
        }

        this.debounceTimer = setTimeout(() => {
            this.getSuggestions(value.trim());
        }, 300);
    }

    async getSuggestions(query) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/${query}`);
            const data = await response.json();
            
            if (Array.isArray(data) && data.length > 0) {
                this.showSuggestions(data);
            } else {
                this.hideSuggestions();
            }
        } catch (error) {
            this.hideSuggestions();
        }
    }

    showSuggestions(data) {
        this.searchSuggestions.innerHTML = '';
        
        // Show exact match first
        const exactMatch = data.find(item => 
            item.word.toLowerCase() === this.searchInput.value.toLowerCase()
        );
        
        if (exactMatch) {
            const exactItem = this.createSuggestionItem(exactMatch.word, true);
            this.searchSuggestions.appendChild(exactItem);
        }

        // Show other suggestions (limit to 5)
        const otherSuggestions = data
            .filter(item => item.word.toLowerCase() !== this.searchInput.value.toLowerCase())
            .slice(0, 5);

        otherSuggestions.forEach(item => {
            const suggestionItem = this.createSuggestionItem(item.word, false);
            this.searchSuggestions.appendChild(suggestionItem);
        });

        this.searchSuggestions.style.display = 'block';
    }

    createSuggestionItem(word, isExact) {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = word;
        
        if (isExact) {
            item.style.fontWeight = '600';
            item.style.backgroundColor = '#f0f8ff';
        }
        
        item.addEventListener('click', () => {
            this.searchInput.value = word;
            this.hideSuggestions();
            this.searchWord();
        });
        
        return item;
    }

    hideSuggestions() {
        this.searchSuggestions.style.display = 'none';
    }

    async searchWord() {
        const word = this.searchInput.value.trim();
        
        if (!word) {
            this.showError('Please enter a word to search');
            return;
        }

        this.showLoading();
        this.hideSuggestions();

        try {
            const response = await fetch(`${this.apiBaseUrl}/${encodeURIComponent(word)}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    this.showError(`No definition found for "${word}"`);
                } else {
                    this.showError('Something went wrong. Please try again.');
                }
                return;
            }

            const data = await response.json();
            
            if (Array.isArray(data) && data.length > 0) {
                this.displayResults(data);
            } else {
                this.showError(`No definition found for "${word}"`);
            }
        } catch (error) {
            console.error('Error fetching word:', error);
            this.showError('Network error. Please check your connection and try again.');
        }
    }

    displayResults(data) {
        this.hideLoading();
        this.hideError();
        
        this.wordResults.innerHTML = '';
        
        data.forEach(wordData => {
            const wordElement = this.createWordElement(wordData);
            this.wordResults.appendChild(wordElement);
        });
        
        this.wordResults.style.display = 'block';
    }

    createWordElement(wordData) {
        const wordDiv = document.createElement('div');
        wordDiv.className = 'word-results';
        
        // Word header
        const header = this.createWordHeader(wordData);
        wordDiv.appendChild(header);
        
        // Meanings
        const meanings = this.createMeanings(wordData.meanings);
        wordDiv.appendChild(meanings);
        
        return wordDiv;
    }

    createWordHeader(wordData) {
        const header = document.createElement('div');
        header.className = 'word-header';
        
        const title = document.createElement('div');
        title.className = 'word-title';
        
        const wordText = document.createElement('h2');
        wordText.className = 'word-text';
        wordText.textContent = wordData.word;
        title.appendChild(wordText);
        
        if (wordData.phonetic) {
            const phonetic = document.createElement('span');
            phonetic.className = 'phonetic';
            phonetic.textContent = wordData.phonetic;
            title.appendChild(phonetic);
        }
        
        header.appendChild(title);
        
        // Audio button
        if (wordData.phonetics && wordData.phonetics.length > 0) {
            const audioPhonetic = wordData.phonetics.find(p => p.audio);
            if (audioPhonetic) {
                const audioBtn = this.createAudioButton(audioPhonetic.audio);
                header.appendChild(audioBtn);
            }
        }
        
        return header;
    }

    createAudioButton(audioUrl) {
        const audioBtn = document.createElement('button');
        audioBtn.className = 'audio-btn';
        audioBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        
        audioBtn.addEventListener('click', () => {
            this.playAudio(audioUrl, audioBtn);
        });
        
        return audioBtn;
    }

    playAudio(audioUrl, button) {
        // Stop current audio if playing
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        
        this.currentAudio = new Audio(audioUrl);
        
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        this.currentAudio.addEventListener('canplaythrough', () => {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-volume-up"></i>';
        });
        
        this.currentAudio.addEventListener('error', () => {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-times"></i>';
        });
        
        this.currentAudio.addEventListener('ended', () => {
            button.innerHTML = '<i class="fas fa-volume-up"></i>';
        });
        
        this.currentAudio.play().catch(error => {
            console.error('Error playing audio:', error);
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-times"></i>';
        });
    }

    createMeanings(meanings) {
        const meaningsDiv = document.createElement('div');
        meaningsDiv.className = 'meanings';
        
        meanings.forEach(meaning => {
            const meaningElement = this.createMeaningElement(meaning);
            meaningsDiv.appendChild(meaningElement);
        });
        
        return meaningsDiv;
    }

    createMeaningElement(meaning) {
        const meaningDiv = document.createElement('div');
        meaningDiv.className = 'meaning';
        
        const partOfSpeech = document.createElement('h3');
        partOfSpeech.className = 'part-of-speech';
        partOfSpeech.textContent = meaning.partOfSpeech;
        meaningDiv.appendChild(partOfSpeech);
        
        meaning.definitions.forEach((definition, index) => {
            const definitionElement = this.createDefinitionElement(definition, index + 1);
            meaningDiv.appendChild(definitionElement);
        });
        
        return meaningDiv;
    }

    createDefinitionElement(definition, number) {
        const definitionDiv = document.createElement('div');
        definitionDiv.className = 'definition-item';
        
        const definitionText = document.createElement('p');
        definitionText.className = 'definition-text';
        definitionText.innerHTML = `<strong>${number}.</strong> ${definition.definition}`;
        definitionDiv.appendChild(definitionText);
        
        if (definition.example) {
            const example = document.createElement('div');
            example.className = 'example';
            example.textContent = `"${definition.example}"`;
            definitionDiv.appendChild(example);
        }
        
        // Synonyms
        if (definition.synonyms && definition.synonyms.length > 0) {
            const synonyms = this.createTagsSection('Synonyms', definition.synonyms, 'synonym');
            definitionDiv.appendChild(synonyms);
        }
        
        // Antonyms
        if (definition.antonyms && definition.antonyms.length > 0) {
            const antonyms = this.createTagsSection('Antonyms', definition.antonyms, 'antonym');
            definitionDiv.appendChild(antonyms);
        }
        
        return definitionDiv;
    }

    createTagsSection(title, tags, type) {
        const section = document.createElement('div');
        section.className = type + 's';
        
        const heading = document.createElement('h4');
        heading.textContent = title;
        section.appendChild(heading);
        
        tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = `${type}-tag`;
            tagElement.textContent = tag;
            tagElement.addEventListener('click', () => {
                this.searchInput.value = tag;
                this.searchWord();
            });
            section.appendChild(tagElement);
        });
        
        return section;
    }

    showLoading() {
        this.loading.style.display = 'block';
        this.error.style.display = 'none';
        this.wordResults.style.display = 'none';
    }

    hideLoading() {
        this.loading.style.display = 'none';
    }

    showError(message) {
        this.hideLoading();
        this.errorMessage.textContent = message;
        this.error.style.display = 'block';
        this.wordResults.style.display = 'none';
    }

    hideError() {
        this.error.style.display = 'none';
    }

    clearResults() {
        this.wordResults.style.display = 'none';
        this.error.style.display = 'none';
        this.loading.style.display = 'none';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DictionaryApp();
});

// Add some sample words for demonstration
const sampleWords = [
    'serendipity',
    'ephemeral',
    'mellifluous',
    'petrichor',
    'sonder',
    'JavaScript',
    'algorithm',
    'serendipity'
];

// Add sample words to suggestions on page load
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    
    // Add placeholder text with sample words
    const placeholders = [
        'Enter a word to define...',
        'Try "serendipity"...',
        'Try "ephemeral"...',
        'Try "JavaScript"...'
    ];
    
    let placeholderIndex = 0;
    setInterval(() => {
        searchInput.placeholder = placeholders[placeholderIndex];
        placeholderIndex = (placeholderIndex + 1) % placeholders.length;
    }, 3000);
}); 