"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { checkBarcodeUniqueness, updateProductBarcode } from "@/lib/actions/barcode.actions";
import {
    AlertCircle,
    Barcode,
    Check,
    Copy,
    Download,
    Printer,
    RefreshCw,
    Save
} from "lucide-react";
import { useCallback, useRef, useState, useTransition } from "react";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import {
    BarcodeFormat,
    generateEAN13Barcode,
    generateUniqueBarcode
} from "./BarcodeGenerator";
import { BarcodePrintTemplate, LabelSize } from "./BarcodePrintTemplate";

interface BarcodeDialogProps {
  productId: string;
  productName: string;
  currentBarcode?: string | null;
  price?: number;
  trigger?: React.ReactNode;
  onBarcodeUpdated?: () => void;
}

export function BarcodeDialog({
  productId,
  productName,
  currentBarcode,
  price,
  trigger,
  onBarcodeUpdated,
}: BarcodeDialogProps) {
  const [open, setOpen] = useState(false);
  const [barcode, setBarcode] = useState(currentBarcode || "");
  const [format, setFormat] = useState<BarcodeFormat>("CODE128");
  const [labelSize, setLabelSize] = useState<LabelSize>("medium");
  const [showPrice, setShowPrice] = useState(true);
  const [showProductName, setShowProductName] = useState(true);
  const [copies, setCopies] = useState(1);
  const [isUnique, setIsUnique] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();
  
  const printRef = useRef<HTMLDivElement>(null);

  // Print functionality
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Barcode-${productName}`,
  });

  // Generate new barcode
  const handleGenerateBarcode = useCallback(() => {
    let newBarcode: string;
    
    if (format === "EAN13") {
      newBarcode = generateEAN13Barcode();
    } else {
      newBarcode = generateUniqueBarcode("ST");
    }
    
    setBarcode(newBarcode);
    setIsUnique(null);
  }, [format]);

  // Check uniqueness
  const handleCheckUniqueness = useCallback(async () => {
    if (!barcode.trim()) {
      toast.error("Please enter a barcode first");
      return;
    }

    startTransition(async () => {
      const result = await checkBarcodeUniqueness(barcode, productId);
      setIsUnique(result.isUnique);
      
      if (result.isUnique) {
        toast.success("Barcode is available!");
      } else {
        toast.error(`Barcode already used by: ${result.existingProductName}`);
      }
    });
  }, [barcode, productId]);

  // Save barcode
  const handleSaveBarcode = useCallback(async () => {
    if (!barcode.trim()) {
      toast.error("Please enter or generate a barcode first");
      return;
    }

    startTransition(async () => {
      const result = await updateProductBarcode(productId, barcode);
      
      if (result.success) {
        toast.success("Barcode saved successfully!");
        setIsUnique(true);
        onBarcodeUpdated?.();
      } else {
        toast.error(result.error || "Failed to save barcode");
      }
    });
  }, [barcode, productId, onBarcodeUpdated]);

  // Download as PNG
  const handleDownload = useCallback(async () => {
    if (!barcode.trim()) {
      toast.error("Please enter or generate a barcode first");
      return;
    }

    try {
      // Find the SVG element within the print template
      const svg = printRef.current?.querySelector("svg");
      if (!svg) {
        toast.error("Could not find barcode to download");
        return;
      }

      // Create a canvas and draw the SVG
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Get SVG dimensions
      const svgRect = svg.getBoundingClientRect();
      const scale = 2; // Higher resolution
      canvas.width = svgRect.width * scale;
      canvas.height = svgRect.height * scale;
      
      // Fill white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Convert SVG to image
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(svgUrl);

        // Download
        const link = document.createElement("a");
        link.download = `barcode-${productName.replace(/\s+/g, "-")}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        
        toast.success("Barcode downloaded!");
      };
      img.src = svgUrl;
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download barcode");
    }
  }, [barcode, productName]);

  // Copy barcode to clipboard
  const handleCopyBarcode = useCallback(async () => {
    if (!barcode.trim()) return;
    
    try {
      await navigator.clipboard.writeText(barcode);
      toast.success("Barcode copied to clipboard!");
    } catch {
      toast.error("Failed to copy barcode");
    }
  }, [barcode]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Barcode className="h-4 w-4 mr-1" />
            Barcode
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Barcode className="h-5 w-5" />
            Barcode for {productName}
          </DialogTitle>
          <DialogDescription>
            Generate, print, or download a barcode for this product.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4 overflow-y-auto flex-1 pr-1">
          {/* Barcode Input Section */}
          <div className="grid gap-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label htmlFor="barcode">Barcode Value</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="barcode"
                    value={barcode}
                    onChange={(e) => {
                      setBarcode(e.target.value);
                      setIsUnique(null);
                    }}
                    placeholder="Enter or generate barcode"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyBarcode}
                    disabled={!barcode.trim()}
                    title="Copy barcode"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleGenerateBarcode}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Auto-Generate
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCheckUniqueness}
                disabled={isPending || !barcode.trim()}
                className="flex-1"
              >
                {isUnique === true ? (
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                ) : isUnique === false ? (
                  <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                ) : null}
                Check Uniqueness
              </Button>
            </div>
          </div>

          {/* Format and Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Barcode Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as BarcodeFormat)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CODE128">CODE128 (Recommended)</SelectItem>
                  <SelectItem value="EAN13">EAN-13 (Retail)</SelectItem>
                  <SelectItem value="CODE39">CODE39 (Alphanumeric)</SelectItem>
                  <SelectItem value="UPC">UPC-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Label Size</Label>
              <Select value={labelSize} onValueChange={(v) => setLabelSize(v as LabelSize)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-price"
                checked={showPrice}
                onCheckedChange={setShowPrice}
              />
              <Label htmlFor="show-price">Show Price</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="show-name"
                checked={showProductName}
                onCheckedChange={setShowProductName}
              />
              <Label htmlFor="show-name">Show Name</Label>
            </div>
            <div>
              <Label htmlFor="copies">Copies</Label>
              <Input
                id="copies"
                type="number"
                min={1}
                max={100}
                value={copies}
                onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                className="mt-1"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <Label className="mb-2 block">Preview</Label>
            {barcode.trim() ? (
              <div className="flex justify-center">
                <BarcodePrintTemplate
                  ref={printRef}
                  productName={productName}
                  barcode={barcode}
                  price={price}
                  format={format}
                  size={labelSize}
                  showPrice={showPrice}
                  showProductName={showProductName}
                  copies={1}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                Enter or generate a barcode to see preview
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 flex-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => handlePrint()}
              disabled={!barcode.trim()}
              className="flex-1"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print ({copies})
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
              disabled={!barcode.trim()}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
          <Button
            type="button"
            onClick={handleSaveBarcode}
            disabled={isPending || !barcode.trim()}
          >
            <Save className="h-4 w-4 mr-2" />
            {isPending ? "Saving..." : "Save Barcode"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
