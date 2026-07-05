import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { FreeMode } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/free-mode';
import './ServicesCarousel.css';

const cardMotion = {
  hidden: { opacity: 0, y: 28 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      delay: index * 0.1,
      ease: [0.22, 1, 0.36, 1]
    }
  })
};

const sectionMotion = {
  hidden: { opacity: 0, y: 56 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
  }
};

function ServiceSkeleton({ index }) {
  return (
    <SwiperSlide className="services-carousel-slide">
      <div
        className="flex min-h-[240px] flex-col rounded-2xl border border-white/[0.04] bg-white/[0.01] p-6 backdrop-blur-lg animate-pulse sm:min-h-[260px] sm:rounded-3xl sm:p-8"
        aria-hidden="true"
      >
        <div className="h-3 w-20 rounded-full bg-white/10" />
        <div className="mt-5 h-8 w-4/5 rounded-lg bg-white/10" />
        <div className="mt-auto flex items-end justify-between">
          <div className="h-7 w-24 rounded-lg bg-[#d4af37]/10 sm:w-28" />
          <div className="h-10 w-24 rounded-full border border-[#d4af37]/10 sm:w-32" />
        </div>
        <span className="sr-only">Loading service {index + 1}</span>
      </div>
    </SwiperSlide>
  );
}

function ServicesCarousel({ services, loading, onBook }) {
  return (
    <motion.section
      id="services"
      className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-20 lg:px-12 lg:py-24"
      variants={sectionMotion}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
    >
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="text-xs uppercase tracking-[0.2em] text-primary">Premium Services</span>
          <h2 className="mt-4 font-serif text-3xl text-white sm:text-4xl md:text-5xl">Signature Rituals</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-gray-400 sm:text-base md:text-lg">
            Curated treatments tailored to elevate your look and leave a lasting impression.
          </p>
        </motion.div>

        <div className="relative mt-10 sm:mt-14">
          <Swiper
            className="services-carousel"
            modules={[FreeMode]}
            freeMode
            grabCursor
            slidesPerView="auto"
            spaceBetween={30}
          >
            {loading && Array.from({ length: 4 }).map((_, index) => (
              <ServiceSkeleton key={`service-placeholder-${index}`} index={index} />
            ))}

            {!loading && services.map((service, index) => (
              <SwiperSlide key={service._id} className="services-carousel-slide">
                <motion.article
                  className="group flex min-h-[240px] flex-col rounded-2xl border border-white/[0.04] bg-white/[0.01] p-6 backdrop-blur-lg transition-all duration-500 ease-out hover:scale-[1.03] hover:border-[#d4af37]/20 hover:shadow-[0_20px_50px_-15px_rgba(212,175,55,0.25)] sm:min-h-[260px] sm:rounded-3xl sm:p-8"
                  custom={index}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  variants={cardMotion}
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                    {service.duration} mins
                  </p>

                  <h3 className="mt-5 line-clamp-3 break-words font-brand text-2xl leading-tight text-white sm:line-clamp-2 sm:text-3xl">
                    {service.name}
                  </h3>

                  <div className="mt-auto flex items-end justify-between gap-4">
                    <span className="whitespace-nowrap text-lg font-bold text-[#d4af37] sm:text-xl">
                      Rs. {Number(service.price || 0).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => onBook(service._id)}
                      className="flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-[#d4af37] transition-all duration-300 hover:opacity-80"
                      aria-label={`Book ${service.name}`}
                    >
                      Book now <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </motion.article>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {!loading && services.length === 0 && (
          <p className="mt-12 text-center text-neutral-500">No services available yet.</p>
        )}
      </div>
    </motion.section>
  );
}

export default ServicesCarousel;
