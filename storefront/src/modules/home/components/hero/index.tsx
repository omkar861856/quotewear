import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import { Heading } from "@medusajs/ui"
import Button from "@/modules/common/components/button"
import Image from "next/image"

const Hero = () => {
  return (
    <div className="h-[80vh] w-full border-b border-ui-border-base relative bg-slate-900 overflow-hidden">
      <Image
        src="/hero-image.png"
        alt="Custom corporate apparel display"
        layout="fill"
        objectFit="cover"
        quality={100}
        priority
        className="opacity-95 select-none"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-900/60 to-transparent z-10" />
      <div className="absolute inset-0 z-20 flex flex-col justify-center items-start text-left content-container small:px-16 gap-6 max-w-4xl">
        <span className="max-w-2xl">
          <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Corporate Events & Bulk Orders
          </p>

          <Heading
            level="h1"
            className="text-5xl small:text-7xl font-bold tracking-tight text-white leading-tight mb-6"
          >
            Custom Garments <br />
            For Your Team.
          </Heading>

          <p className="text-slate-200 font-normal text-base small:text-lg leading-relaxed">
            Design and order custom branded shirts, polo shirts, hoodies, and jackets for corporate events or promotions. Add items to your company cart and request a customized bulk quote instantly.
          </p>
        </span>
        <div className="flex flex-wrap gap-4 mt-2">
          <LocalizedClientLink href="/store">
            <Button variant="primary" className="rounded-full px-6 py-3 h-11 bg-white hover:bg-slate-100 text-slate-900 border-none font-medium text-sm">
              Browse Catalog
            </Button>
          </LocalizedClientLink>
          <LocalizedClientLink href="/account">
            <Button variant="secondary" className="rounded-full px-6 py-3 h-11 bg-slate-800/80 hover:bg-slate-700/80 text-white border border-slate-700 font-medium text-sm">
              Get a Quote
            </Button>
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  )
}

export default Hero
