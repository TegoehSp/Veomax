/* tslint:disable */
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import {GenerateContentResponse, GenerateVideosParameters, GoogleGenAI} from '@google/genai';
import Cropper from 'cropperjs';

let geminiApiKey: string | null = null;

const loadingMessages = [
  'Memulai proses pembuatan...',
  'Menganalisis prompt Anda...',
  'Mengumpulkan ide-ide kreatif...',
  'Menghidupkan imajinasi Anda...',
  'Merender frame demi frame...',
  'Ini mungkin memakan waktu beberapa menit...',
  'Menambahkan sentuhan akhir...',
  'Hampir selesai!',
];

// App State
let base64data = '';
let prompt = '';
let currentMode = 'text'; // 'text' or 'image'
let currentModel = 'veo-2.0-generate-001';
let aspectRatio = '16:9';
let numberOfVideos = 1;
let cropper: Cropper | null = null;
let generatedVideos: { url: string; element: HTMLVideoElement }[] = [];
let currentVideoIndex = 0;
let numberOfImagesToGenerate = 1;
let selectedImageData = '';


async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function blobToBase64(blob: Blob) {
  return new Promise<string>(async (resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      resolve(url.split(',')[1]);
    };
    reader.readAsDataURL(blob);
  });
}

async function generateContent(
  prompt: string,
  imageBytes: string,
  aspectRatioValue: string,
  videoCount: number,
) {
  if (!geminiApiKey) {
    showErrorModal(['Silakan atur API Key Gemini Anda terlebih dahulu.']);
    return;
  }
  const ai = new GoogleGenAI({apiKey: geminiApiKey});

  // Start with a base configuration
  const payload: GenerateVideosParameters = {
    model: currentModel,
    prompt,
    config: {
      aspectRatio: aspectRatioValue,
      numberOfVideos: videoCount,
    },
  };

  // Only add the image property if we are in image mode and have image data
  if (currentMode === 'image' && imageBytes) {
    payload.image = {
      imageBytes,
      mimeType: 'image/png', // Assuming png for simplicity
    };
  }

  // The payload will now correctly be either text-only or text-and-image
  let operation = await ai.models.generateVideos(payload);

  while (!operation.done) {
    console.log('Waiting for completion');
    await delay(1000);
    operation = await ai.operations.getVideosOperation({operation});
  }

  const videos = operation.response?.generatedVideos;
  if (videos === undefined || videos.length === 0) {
    throw new Error('No videos generated');
  }

  for (const v of videos) {
    const url = decodeURIComponent(v.video.uri);
    const res = await fetch(`${url}&key=${geminiApiKey}`);
    const blob = await res.blob();
    const objectURL = URL.createObjectURL(blob);
    
    const videoEl = document.createElement('video');
    videoEl.src = objectURL;
    videoEl.className = 'generated-video';
    videoEl.controls = true;
    videoEl.loop = true;
    
    videoContainer.appendChild(videoEl);
    generatedVideos.push({ url: objectURL, element: videoEl });
  }

  setupVideoDisplay();
}

// Element Selectors
const upload = document.querySelector('#file-input') as HTMLInputElement;
const promptEl = document.querySelector('#prompt-input') as HTMLTextAreaElement;
const statusPlaceholder = document.querySelector('#status-placeholder') as HTMLDivElement;
const errorModal = document.querySelector('#error-modal') as HTMLDivElement;
const errorMessageContainer = document.querySelector(
  '#error-message-container',
) as HTMLDivElement;
const modalAddKeyButton = document.querySelector(
  '#modal-add-key-button',
) as HTMLButtonElement;
const modalCloseButton = document.querySelector(
  '#modal-close-button',
) as HTMLButtonElement;
const generateButton = document.querySelector(
  '#generate-button',
) as HTMLButtonElement;
const loadingOverlay = document.querySelector('#loading-overlay') as HTMLDivElement;
const loadingText = document.querySelector('#loading-text') as HTMLParagraphElement;

// API Key Modal Elements
const apiKeyModal = document.querySelector('#api-key-modal') as HTMLDivElement;
const apiKeyInput = document.querySelector('#api-key-input') as HTMLInputElement;
const saveApiKeyButton = document.querySelector('#save-api-key-button') as HTMLButtonElement;
const apiKeySettingsButton = document.querySelector('#api-key-settings-button') as HTMLButtonElement;
const pasteApiKeyButton = document.querySelector('#paste-api-key-button') as HTMLButtonElement;
const cancelApiKeyButton = document.querySelector('#cancel-api-key-button') as HTMLButtonElement;
const deleteApiKeyButton = document.querySelector('#delete-api-key-button') as HTMLButtonElement;
const apiKeyValidationFeedback = document.querySelector('#api-key-validation-feedback') as HTMLDivElement;
const toggleApiKeyVisibilityButton = document.querySelector('#toggle-api-key-visibility') as HTMLButtonElement;
const eyeIcon = document.querySelector('.eye-icon') as SVGElement;
const eyeOffIcon = document.querySelector('.eye-off-icon') as SVGElement;


// Video Carousel Elements
const videoDisplayContainer = document.querySelector('#video-display-container') as HTMLDivElement;
const videoContainer = document.querySelector('#video-container') as HTMLDivElement;
const prevVideoButton = document.querySelector('#prev-video') as HTMLButtonElement;
const nextVideoButton = document.querySelector('#next-video') as HTMLButtonElement;
const videoCounter = document.querySelector('#video-counter') as HTMLDivElement;
const downloadVideoButton = document.querySelector('#download-video-button') as HTMLButtonElement;


// Image upload menu elements
const imageUploadContainer = document.querySelector('#image-upload-container') as HTMLDivElement;
const imageUploadButton = document.querySelector('#image-upload-button') as HTMLButtonElement;
const imageUploadMenu = document.querySelector('#image-upload-menu') as HTMLDivElement;
const createImageButton = document.querySelector('#create-image-button') as HTMLButtonElement;
const imageEditMenu = document.querySelector('#image-edit-menu') as HTMLDivElement;
const changeImageButton = document.querySelector('#change-image-button') as HTMLButtonElement;
const removeImageButton = document.querySelector('#remove-image-button') as HTMLButtonElement;


// Mode select elements
const modeSelectContainer = document.querySelector('.mode-select-container') as HTMLDivElement;
const modeSelectButton = document.querySelector(
  '.mode-select'
) as HTMLButtonElement;
const modeSelectText = document.querySelector('#mode-select-text') as HTMLSpanElement;
const modeDropdown = document.querySelector('#mode-dropdown') as HTMLDivElement;
const modeOptions = document.querySelectorAll('#mode-dropdown .mode-option') as NodeListOf<HTMLButtonElement>;

// Model select elements
const modelSelectContainer = document.querySelector('#model-select-container') as HTMLDivElement;
const modelSelectButton = document.querySelector('#model-select-button') as HTMLButtonElement;
const modelSelectText = document.querySelector('#model-select-text') as HTMLSpanElement;
const modelDropdown = document.querySelector('#model-dropdown') as HTMLDivElement;
const modelOptions = document.querySelectorAll('#model-dropdown .model-option') as NodeListOf<HTMLButtonElement>;

// Settings menu elements
const settingsContainer = document.querySelector('#settings-container') as HTMLDivElement;
const settingsButton = document.querySelector('#settings-button') as HTMLButtonElement;
const settingsMenu = document.querySelector('#settings-menu') as HTMLDivElement;
const aspectRatioOptions = document.querySelectorAll('.aspect-ratio-option') as NodeListOf<HTMLButtonElement>;
const videoCountOptions = document.querySelectorAll('.video-count-option') as NodeListOf<HTMLButtonElement>;

// Crop modal elements
const cropModal = document.querySelector('#crop-modal') as HTMLDivElement;
const imageToCrop = document.querySelector('#image-to-crop') as HTMLImageElement;
const confirmCropButton = document.querySelector('#confirm-crop-button') as HTMLButtonElement;
const cancelCropButton = document.querySelector('#cancel-crop-button') as HTMLButtonElement;

// Image prompt modal elements
const imagePromptModal = document.querySelector('#image-prompt-modal') as HTMLDivElement;
const imagePromptInput = document.querySelector('#image-prompt-input') as HTMLTextAreaElement;
const imageCountOptions = document.querySelectorAll('.image-count-option') as NodeListOf<HTMLButtonElement>;
const confirmImagePromptButton = document.querySelector('#confirm-image-prompt-button') as HTMLButtonElement;
const cancelImagePromptButton = document.querySelector('#cancel-image-prompt-button') as HTMLButtonElement;

// Image selection modal elements
const imageSelectionModal = document.querySelector('#image-selection-modal') as HTMLDivElement;
const imageSelectionContainer = document.querySelector('#image-selection-container') as HTMLDivElement;
const confirmImageSelectionButton = document.querySelector('#confirm-image-selection-button') as HTMLButtonElement;
const cancelImageSelectionButton = document.querySelector('#cancel-image-selection-button') as HTMLButtonElement;

// Initial Setup
imageUploadContainer.style.display = 'none'; // Hide initially as default is text-to-video

// Event Listeners
upload.addEventListener('change', async (e) => {
  imageUploadMenu.classList.remove('show');
  const file = (e.target as HTMLInputElement).files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    openCropModal(event.target.result as string);
  };
  reader.readAsDataURL(file);
});

confirmCropButton.addEventListener('click', () => {
  if (cropper) {
    cropper.getCroppedCanvas().toBlob(async (blob) => {
      if (blob) {
        base64data = await blobToBase64(blob);
        console.log('Image cropped and loaded');
        const imageUrl = `data:image/png;base64,${base64data}`;
        imageUploadButton.style.backgroundImage = `url(${imageUrl})`;
        imageUploadButton.classList.add('has-image-preview');
      }
      cropper.destroy();
      cropper = null;
      cropModal.style.display = 'none';
      upload.value = ''; // Reset file input
    });
  }
});

cancelCropButton.addEventListener('click', () => {
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    cropModal.style.display = 'none';
    upload.value = ''; // Reset file input
});

promptEl.addEventListener('input', () => {
  prompt = promptEl.value;
  // Auto-resize textarea
  promptEl.style.height = 'auto';
  promptEl.style.height = `${promptEl.scrollHeight}px`;
});

modalCloseButton.addEventListener('click', () => {
  errorModal.style.display = 'none';
});

modalAddKeyButton.addEventListener('click', () => {
  errorModal.style.display = 'none';
  openApiKeyModal();
});

imageUploadButton.addEventListener('click', () => {
  // Hide all other menus first
  modeDropdown.classList.remove('show');
  modelDropdown.classList.remove('show');
  settingsMenu.classList.remove('show');

  // Decide which menu to show based on whether an image is already loaded
  if (base64data) {
    imageEditMenu.classList.toggle('show');
    imageUploadMenu.classList.remove('show');
  } else {
    imageUploadMenu.classList.toggle('show');
    imageEditMenu.classList.remove('show');
  }
});

changeImageButton.addEventListener('click', () => {
  imageEditMenu.classList.remove('show');
  upload.click(); // Directly trigger file input
});

removeImageButton.addEventListener('click', () => {
  imageEditMenu.classList.remove('show');
  base64data = '';
  imageUploadButton.style.backgroundImage = 'none';
  imageUploadButton.classList.remove('has-image-preview');
});

createImageButton.addEventListener('click', () => {
  imageUploadMenu.classList.remove('show');
  imagePromptInput.value = '';
  imagePromptModal.style.display = 'flex';
  imagePromptInput.focus();
});

cancelImagePromptButton.addEventListener('click', () => {
  imagePromptModal.style.display = 'none';
});

imageCountOptions.forEach(option => {
  option.addEventListener('click', () => {
      numberOfImagesToGenerate = parseInt(option.dataset.count, 10);
      imageCountOptions.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
  });
});

confirmImagePromptButton.addEventListener('click', async () => {
  const imagePrompt = imagePromptInput.value.trim();
  if (!imagePrompt) {
      alert('Silakan masukkan prompt untuk membuat gambar.');
      return;
  }

  if (!geminiApiKey) {
    imagePromptModal.style.display = 'none';
    showErrorModal(['Silakan atur API Key Gemini Anda terlebih dahulu.']);
    return;
  }

  const originalButtonText = confirmImagePromptButton.textContent;
  confirmImagePromptButton.textContent = 'Membuat...';
  confirmImagePromptButton.disabled = true;
  cancelImagePromptButton.disabled = true;

  try {
      const ai = new GoogleGenAI({apiKey: geminiApiKey});
      const response = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: imagePrompt,
          config: {
              numberOfImages: numberOfImagesToGenerate,
              outputMimeType: 'image/png',
          },
      });

      imagePromptModal.style.display = 'none';

      if (response.generatedImages.length === 1) {
          const base64ImageBytes = response.generatedImages[0].image.imageBytes;
          const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
          openCropModal(imageUrl);
      } else {
          imageSelectionContainer.innerHTML = '';
          selectedImageData = '';
          confirmImageSelectionButton.disabled = true;

          response.generatedImages.forEach(generatedImage => {
              const base64ImageBytes = generatedImage.image.imageBytes;
              const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
              const img = document.createElement('img');
              img.src = imageUrl;
              img.classList.add('selectable-image');
              img.dataset.imageData = imageUrl;
              imageSelectionContainer.appendChild(img);
          });
          imageSelectionModal.style.display = 'flex';
      }
  } catch(e) {
      console.error('Image generation failed:', e);
      showErrorModal(['Pembuatan gambar gagal. Silakan coba lagi.']);
      imagePromptModal.style.display = 'none';
  } finally {
      confirmImagePromptButton.textContent = originalButtonText;
      confirmImagePromptButton.disabled = false;
      cancelImagePromptButton.disabled = false;
  }
});

imageSelectionContainer.addEventListener('click', (e) => {
  const target = e.target as HTMLImageElement;
  if (target.classList.contains('selectable-image')) {
      imageSelectionContainer.querySelectorAll('.selectable-image').forEach(img => {
          img.classList.remove('selected');
      });
      target.classList.add('selected');
      selectedImageData = target.dataset.imageData;
      confirmImageSelectionButton.disabled = false;
  }
});

confirmImageSelectionButton.addEventListener('click', () => {
  if (selectedImageData) {
      imageSelectionModal.style.display = 'none';
      openCropModal(selectedImageData);
  }
});

cancelImageSelectionButton.addEventListener('click', () => {
  imageSelectionModal.style.display = 'none';
});

modeSelectButton.addEventListener('click', () => {
  modeDropdown.classList.toggle('show');
  modelDropdown.classList.remove('show');
  settingsMenu.classList.remove('show');
  imageUploadMenu.classList.remove('show');
});

modelSelectButton.addEventListener('click', () => {
  modelDropdown.classList.toggle('show');
  modeDropdown.classList.remove('show');
  settingsMenu.classList.remove('show');
  imageUploadMenu.classList.remove('show');
});

settingsButton.addEventListener('click', () => {
  settingsMenu.classList.toggle('show');
  modeDropdown.classList.remove('show');
  modelDropdown.classList.remove('show');
  imageUploadMenu.classList.remove('show');
});

document.addEventListener('click', (event) => {
  if (!modeSelectContainer.contains(event.target as Node)) {
    modeDropdown.classList.remove('show');
  }
  if (!modelSelectContainer.contains(event.target as Node)) {
    modelDropdown.classList.remove('show');
  }
  if (!settingsContainer.contains(event.target as Node)) {
    settingsMenu.classList.remove('show');
  }
  if (!imageUploadContainer.contains(event.target as Node)) {
    imageUploadMenu.classList.remove('show');
    imageEditMenu.classList.remove('show');
  }
});

modeOptions.forEach(option => {
  option.addEventListener('click', () => {
    currentMode = option.dataset.mode;
    modeSelectText.textContent = option.textContent;
    modeDropdown.classList.remove('show');

    if (currentMode === 'image') {
      promptEl.placeholder = "Masukkan teks dan pilih gambar untuk memulai.";
      imageUploadContainer.style.display = 'flex';
    } else {
      promptEl.placeholder = "Masukkan teks untuk memulai pembuatan video.";
      imageUploadContainer.style.display = 'none';
      // Reset image preview when switching back to text mode
      base64data = '';
      imageUploadButton.style.backgroundImage = 'none';
      imageUploadButton.classList.remove('has-image-preview');
    }
  });
});

modelOptions.forEach(option => {
  option.addEventListener('click', () => {
    if (option.disabled) return;
    const selectedModel = option.dataset.model;
    // The Veo 3 model is not yet available.
    // Default to Veo 2 for now to keep the app functional.
    if (selectedModel === 'veo-3.0-generate-001') {
      currentModel = 'veo-2.0-generate-001';
    } else {
      currentModel = selectedModel;
    }
    modelSelectText.textContent = option.textContent;
    modelDropdown.classList.remove('show');
  });
});

aspectRatioOptions.forEach(option => {
    option.addEventListener('click', () => {
        aspectRatio = option.dataset.ratio;
        aspectRatioOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');

        if (cropper) {
            const [w, h] = aspectRatio.split(':').map(Number);
            cropper.setAspectRatio(w / h);
        }
    });
});

videoCountOptions.forEach(option => {
    option.addEventListener('click', () => {
        numberOfVideos = parseInt(option.dataset.count, 10);
        videoCountOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
    });
});

generateButton.addEventListener('click', (e) => {
  if (prompt.trim().length > 0) {
    generate();
  }
});

prevVideoButton.addEventListener('click', () => {
  if (currentVideoIndex > 0) {
    currentVideoIndex--;
    updateVideoCarouselUI();
  }
});

nextVideoButton.addEventListener('click', () => {
  if (currentVideoIndex < generatedVideos.length - 1) {
    currentVideoIndex++;
    updateVideoCarouselUI();
  }
});

downloadVideoButton.addEventListener('click', downloadCurrentVideo);


// Main Functions
function downloadCurrentVideo() {
  if (generatedVideos.length > 0 && generatedVideos[currentVideoIndex]) {
    const video = generatedVideos[currentVideoIndex];
    const a = document.createElement('a');
    a.href = video.url;
    const promptSnippet = prompt.trim().slice(0, 20).replace(/\s/g, '_') || 'video';
    a.download = `veo_${promptSnippet}_${currentVideoIndex + 1}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

function showErrorModal(messages: string[]) {
  errorMessageContainer.innerHTML = '';
  messages.forEach((msg) => {
    const p = document.createElement('p');
    p.textContent = msg;
    errorMessageContainer.appendChild(p);
  });
  errorModal.style.display = 'flex';
}

function openCropModal(imageUrl: string) {
  cropModal.style.display = 'flex';
  if (cropper) {
    cropper.destroy();
  }
  imageToCrop.src = imageUrl;
  const [w, h] = aspectRatio.split(':').map(Number);
  cropper = new Cropper(imageToCrop, {
    aspectRatio: w / h,
    viewMode: 1,
  });
}

function setupVideoDisplay() {
  currentVideoIndex = 0;
  if (generatedVideos.length > 0) {
    videoDisplayContainer.style.display = 'flex';
    downloadVideoButton.style.display = 'flex';
    if (generatedVideos.length > 1) {
      prevVideoButton.style.display = 'flex';
      nextVideoButton.style.display = 'flex';
      videoCounter.style.display = 'block';
    }
    updateVideoCarouselUI();
  }
}

function updateVideoCarouselUI() {
  if (generatedVideos.length === 0) return;

  videoContainer.style.transform = `translateX(-${currentVideoIndex * 100}%)`;

  videoCounter.textContent = `${currentVideoIndex + 1} / ${generatedVideos.length}`;

  prevVideoButton.disabled = currentVideoIndex === 0;
  nextVideoButton.disabled = currentVideoIndex === generatedVideos.length - 1;

  // Pause all videos and only play the current one
  generatedVideos.forEach((v, index) => {
    if (index === currentVideoIndex) {
      v.element.play();
    } else {
      v.element.pause();
      v.element.currentTime = 0; // Optional: rewind non-active videos
    }
  });
}

async function generate() {
  if (!geminiApiKey) {
    showErrorModal(['Silakan atur API Key Gemini Anda terlebih dahulu.']);
    return;
  }

  if (currentMode === 'image' && !base64data) {
    showErrorModal(['Silakan unggah dan potong gambar untuk mode "Gambar ke Video".']);
    return;
  }

  statusPlaceholder.style.display = 'none';
  videoDisplayContainer.style.display = 'none';
  
  let messageIndex = 0;
  loadingText.textContent = loadingMessages[messageIndex];
  loadingOverlay.style.aspectRatio = aspectRatio.replace(':', ' / ');
  loadingOverlay.style.display = 'flex';
  const messageInterval = setInterval(() => {
    messageIndex = (messageIndex + 1) % loadingMessages.length;
    loadingText.textContent = loadingMessages[messageIndex];
  }, 3000);


  // Clear previous videos and revoke old object URLs to prevent memory leaks
  generatedVideos.forEach(v => URL.revokeObjectURL(v.url));
  generatedVideos = [];
  videoContainer.innerHTML = '';
  prevVideoButton.style.display = 'none';
  nextVideoButton.style.display = 'none';
  videoCounter.style.display = 'none';
  downloadVideoButton.style.display = 'none';


  // Disable controls
  generateButton.disabled = true;
  upload.disabled = true;
  promptEl.disabled = true;
  modeSelectButton.disabled = true;
  modelSelectButton.disabled = true;
  settingsButton.disabled = true;

  try {
    await generateContent(prompt, base64data, aspectRatio, numberOfVideos);
    statusPlaceholder.style.display = 'none';
  } catch (e) {
    console.error('Video generation failed:', e);
    const error = e as Error;
    let errorMessages = [
        'Pembuatan video gagal.',
        'Ini bisa terjadi jika model tidak tersedia atau jika API key tidak valid.',
    ];

    try {
        const errorMessage = error.message || String(e);
        // The error message from the API might be prefixed or suffixed with text.
        // Find the start of the JSON object and the end of it to parse correctly.
        const jsonStartIndex = errorMessage.indexOf('{');
        const jsonEndIndex = errorMessage.lastIndexOf('}');
        
        if (jsonStartIndex > -1 && jsonEndIndex > jsonStartIndex) {
            const jsonPart = errorMessage.substring(jsonStartIndex, jsonEndIndex + 1);
            const parsedError = JSON.parse(jsonPart);
            if (parsedError?.error?.status === 'RESOURCE_EXHAUSTED') {
                errorMessages = [
                    'Pembuatan Video Gagal: Kuota Terlampaui',
                    'Kuota penggunaan API key Anda telah habis. Silakan gunakan API key yang berbeda melalui menu pengaturan.',
                ];
            } else {
                 errorMessages.push(`Detail: ${errorMessage}`);
            }
        } else {
             errorMessages.push(`Detail: ${errorMessage}`);
        }
    } catch (parseError) {
        // If parsing still fails, just show the raw error.
        errorMessages.push(`Detail: ${error.message || String(e)}`);
    }

    showErrorModal(errorMessages);
    statusPlaceholder.style.display = 'block';
  } finally {
    clearInterval(messageInterval);
    loadingOverlay.style.display = 'none';
    // Re-enable controls
    generateButton.disabled = false;
    upload.disabled = false;
    promptEl.disabled = false;
    modeSelectButton.disabled = false;
    modelSelectButton.disabled = false;
    settingsButton.disabled = false;
  }
}

// --- API Key Management ---
const checkmarkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
const xIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

async function validateApiKey(key: string): Promise<boolean> {
  try {
    const ai = new GoogleGenAI({apiKey: key});
    // Use a simple, low-cost call to validate the key.
    const response: GenerateContentResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'test' });
    
    // A truly valid key will result in a response with actual text content.
    // If the key is invalid, the API might not throw but return a response
    // without content, making `response.text` empty.
    if (response && response.text && response.text.trim().length > 0) {
      return true;
    } else {
      // The call succeeded without throwing, but returned an empty/invalid response.
      console.error("API Key validation returned a response with no text content:", response);
      return false;
    }
  } catch (e) {
    // If the API call throws an error (e.g., 400 for a bad key), it's definitely invalid.
    console.error("API Key validation failed with an exception:", e);
    return false;
  }
}

function showValidationFeedback(type: 'success' | 'error', message: string) {
  apiKeyValidationFeedback.innerHTML = `
    ${type === 'success' ? checkmarkIcon : xIcon}
    <span>${message}</span>
  `;
  apiKeyValidationFeedback.className = type === 'success' ? 'validation-success' : 'validation-error';
}

function setApiKeyModalLoading(isLoading: boolean) {
    saveApiKeyButton.classList.toggle('loading', isLoading);
    saveApiKeyButton.disabled = isLoading;
    cancelApiKeyButton.disabled = isLoading;
    deleteApiKeyButton.disabled = isLoading;
    apiKeyInput.disabled = isLoading;
    pasteApiKeyButton.disabled = isLoading;
}

function openApiKeyModal() {
  apiKeyValidationFeedback.innerHTML = '';
  setApiKeyModalLoading(false);

  if (geminiApiKey) {
    apiKeyInput.value = geminiApiKey;
    deleteApiKeyButton.style.display = 'flex';
  } else {
    apiKeyInput.value = '';
    deleteApiKeyButton.style.display = 'none';
  }
  apiKeyModal.style.display = 'flex';
}

toggleApiKeyVisibilityButton.addEventListener('click', () => {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    eyeIcon.style.display = isPassword ? 'none' : 'block';
    eyeOffIcon.style.display = isPassword ? 'block' : 'none';
    toggleApiKeyVisibilityButton.setAttribute('aria-label', isPassword ? 'Sembunyikan API Key' : 'Lihat API Key');
});

apiKeySettingsButton.addEventListener('click', openApiKeyModal);

pasteApiKeyButton.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      apiKeyInput.value = text;
    }
  } catch (err) {
    console.error('Gagal membaca papan klip: ', err);
  }
});

cancelApiKeyButton.addEventListener('click', () => {
  apiKeyModal.style.display = 'none';
});

deleteApiKeyButton.addEventListener('click', () => {
  localStorage.removeItem('geminiApiKey');
  geminiApiKey = null;
  apiKeyInput.value = '';
  deleteApiKeyButton.style.display = 'none';
  apiKeyValidationFeedback.innerHTML = '';
  apiKeyInput.focus();
});

saveApiKeyButton.addEventListener('click', async () => {
  const newKey = apiKeyInput.value.trim();
  if (!newKey) {
    showValidationFeedback('error', 'API Key tidak boleh kosong.');
    return;
  }

  setApiKeyModalLoading(true);
  apiKeyValidationFeedback.innerHTML = '';

  const isValid = await validateApiKey(newKey);

  if (isValid) {
    showValidationFeedback('success', 'API Key Valid!');
    await delay(1500); // Let user see the success message
    localStorage.setItem('geminiApiKey', newKey);
    geminiApiKey = newKey;
    apiKeyModal.style.display = 'none';
  } else {
    setApiKeyModalLoading(false);
    showValidationFeedback('error', 'API Key tidak valid. Silakan periksa kembali.');
  }
});


function initializeApp() {
  geminiApiKey = localStorage.getItem('geminiApiKey');
  if (!geminiApiKey) {
    apiKeyModal.style.display = 'flex';
  }
}

initializeApp();