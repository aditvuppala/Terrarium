export default function ExploreFooter() {
  return (
    <footer className="border-t border-[#C8D3C1] bg-[#F3F5EF] px-4 py-2 text-xs leading-relaxed text-[#3D5245] sm:px-6">
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <span>Listings:</span>
        <a
          href="https://offcampushousing.umich.edu"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[#16241B] underline decoration-[#9FB095] underline-offset-2 hover:text-[#2F6B47]"
        >
          U-M Off-Campus Housing
        </a>
        <span>+ labeled mock data · Transit data provided by permission of</span>
        <a
          href="https://www.theride.org"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[#16241B] underline decoration-[#9FB095] underline-offset-2 hover:text-[#2F6B47]"
        >
          AAATA/TheRide
        </a>
        <span>·</span>
        <a
          href="https://ltp.umich.edu/campus-transit/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[#16241B] underline decoration-[#9FB095] underline-offset-2 hover:text-[#2F6B47]"
        >
          U-M Transit Services GTFS
        </a>
        <span>· ©</span>
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[#16241B] underline decoration-[#9FB095] underline-offset-2 hover:text-[#2F6B47]"
        >
          OpenStreetMap contributors
        </a>
        <span>· Map tiles ©</span>
        <a
          href="https://www.esri.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[#16241B] underline decoration-[#9FB095] underline-offset-2 hover:text-[#2F6B47]"
        >
          Esri
        </a>
      </p>
    </footer>
  );
}
