import { useState, useEffect } from 'preact/hooks';
import { api } from '../lib/api';
import type {
  Animal,
  AnimalDetail,
  GalleryPhoto,
  SiteContent,
  SiteSettings,
  FilterKey,
} from '../lib/types';
import Header from './Header';
import Hero from './Hero';
import About from './About';
import AnimalGrid from './AnimalGrid';
import AnimalDetailModal from './AnimalDetailModal';
import GallerySection from './GallerySection';
import GalleryLightbox from './GalleryLightbox';
import ContactForm from './ContactForm';
import Footer from './Footer';

export default function PublicSite() {
  const [loaded, setLoaded] = useState(false);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [content, setContent] = useState<SiteContent>({});
  const [settings, setSettings] = useState<SiteSettings>({
    showPublicPrices: true,
    galleryStyle: 'grid',
  });

  const [activeFilter, setActiveFilter] = useState<FilterKey>('for-sale');
  const [openAnimalId, setOpenAnimalId] = useState<string | null>(null);
  const [openAnimalDetail, setOpenAnimalDetail] = useState<AnimalDetail | null>(null);
  const [openGalleryPhoto, setOpenGalleryPhoto] = useState<GalleryPhoto | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    Promise.all([api.animals(), api.gallery(), api.content(), api.settings()]).then(
      ([animalsRes, galleryRes, contentRes, settingsRes]) => {
        setAnimals(animalsRes);
        setGallery(galleryRes);
        setContent(contentRes);
        setSettings(settingsRes);
        setLoaded(true);
      },
    );
  }, []);

  useEffect(() => {
    if (!openAnimalId) {
      setOpenAnimalDetail(null);
      return;
    }
    api.animal(openAnimalId).then(setOpenAnimalDetail);
  }, [openAnimalId]);

  function askAbout(name: string) {
    setSelectedAnimal(name);
  }

  if (!loaded) {
    return (
      <div class="loading-shell" role="status" aria-live="polite">
        <p>Loading the herd…</p>
        <style>{`
          .loading-shell {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: var(--font-heading);
            font-size: 18px;
            color: var(--color-text-muted);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div class="page">
      <Header content={content} />
      <Hero content={content} />
      <About content={content} />
      <AnimalGrid
        content={content}
        animals={animals}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        showPublicPrices={settings.showPublicPrices}
        onOpenAnimal={setOpenAnimalId}
        onAskAbout={askAbout}
      />
      {openAnimalDetail && (
        <AnimalDetailModal
          animal={openAnimalDetail}
          showPublicPrices={settings.showPublicPrices}
          onClose={() => setOpenAnimalId(null)}
          onAskAbout={askAbout}
        />
      )}
      <GallerySection
        content={content}
        photos={gallery}
        galleryStyle={settings.galleryStyle}
        onOpenPhoto={setOpenGalleryPhoto}
      />
      {openGalleryPhoto && (
        <GalleryLightbox photo={openGalleryPhoto} onClose={() => setOpenGalleryPhoto(null)} />
      )}
      <ContactForm
        content={content}
        animals={animals}
        selectedAnimal={selectedAnimal}
        onSelectedAnimalChange={setSelectedAnimal}
        submitted={submitted}
        onSubmit={() => setSubmitted(true)}
      />
      <Footer content={content} />

      <style>{`
        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>
  );
}
