from pypdf import PdfReader, PdfWriter

def split_pdf(input_pdf, output_prefix, pages_per_split):
    reader = PdfReader(input_pdf)
    total_pages = len(reader.pages)

    for i in range(0, total_pages, pages_per_split):
        writer = PdfWriter()
        for j in range(i, min(i + pages_per_split, total_pages)):
            writer.add_page(reader.pages[j])
        output_filename = f"{output_prefix}_part_{i // pages_per_split + 1}.pdf"
        with open(output_filename, "wb") as out:
            writer.write(out)

split_pdf("/Users/tarive/tarive/Saksham/study/code/issuu_output.pdf", "splitfile", 100)  # Splits into chunks of 25 pages
