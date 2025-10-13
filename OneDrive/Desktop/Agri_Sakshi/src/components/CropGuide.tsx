import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sprout, 
  Droplets, 
  Calendar, 
  Bug, 
  AlertTriangle,
  Package,
  Leaf,
  Shield
} from "lucide-react";
import { Crop } from "@/data/crops";

interface CropGuideProps {
  crop: Crop;
}

export const CropGuide = ({ crop }: CropGuideProps) => {
  if (!crop.guide) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">Detailed guide not available for this crop yet.</p>
      </Card>
    );
  }

  const { guide } = crop;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-primary shadow-strong">
        <div className="text-white text-center space-y-2">
          <h2 className="text-2xl font-bold">{crop.name} Cultivation Guide</h2>
          <div className="flex justify-center space-x-4 text-sm">
            <Badge variant="secondary">{crop.category}</Badge>
            <Badge variant="secondary">{crop.duration_days[0]}-{crop.duration_days[1]} days</Badge>
            <Badge variant="secondary">Profit: {crop.profit_potential}</Badge>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="planting" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="planting">Planting</TabsTrigger>
          <TabsTrigger value="care">Care</TabsTrigger>
          <TabsTrigger value="protection">Protection</TabsTrigger>
        </TabsList>

        {/* Planting Tab */}
        <TabsContent value="planting" className="space-y-4">
          <Card className="p-4 shadow-soft">
            <h3 className="font-semibold mb-3 flex items-center">
              <Sprout className="w-5 h-5 mr-2 text-success" />
              Planting Guidelines
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Seed Rate</p>
                <p className="font-medium">{guide.planting.seedRate}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Spacing</p>
                <p className="font-medium">{guide.planting.spacing}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Depth</p>
                <p className="font-medium">{guide.planting.depth}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Method</p>
                <p className="font-medium">{guide.planting.method}</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-success/10 rounded-lg">
              <p className="text-sm font-medium text-success">Best Planting Time:</p>
              <p className="text-sm">{guide.planting.bestTime}</p>
            </div>
          </Card>

          <Card className="p-4 shadow-soft">
            <h3 className="font-semibold mb-3 flex items-center">
              <Package className="w-5 h-5 mr-2 text-warning" />
              Harvesting
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Harvesting Indicators:</p>
                <ul className="space-y-1">
                  {guide.harvesting.indicators.map((indicator, idx) => (
                    <li key={idx} className="text-sm flex items-start">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {indicator}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Method</p>
                  <p className="font-medium">{guide.harvesting.method}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Storage</p>
                  <p className="font-medium">{guide.harvesting.storage}</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Care Tab */}
        <TabsContent value="care" className="space-y-4">
          <Card className="p-4 shadow-soft">
            <h3 className="font-semibold mb-3 flex items-center">
              <Droplets className="w-5 h-5 mr-2 text-info" />
              Irrigation Management
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Frequency</p>
                  <p className="font-medium">{guide.irrigation.frequency}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                  <p className="font-medium">{guide.irrigation.amount}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Method</p>
                  <p className="font-medium">{guide.irrigation.method}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Critical Irrigation Stages:</p>
                <div className="flex flex-wrap gap-2">
                  {guide.irrigation.criticalStages.map((stage, idx) => (
                    <Badge key={idx} variant="outline">{stage}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 shadow-soft">
            <h3 className="font-semibold mb-3 flex items-center">
              <Leaf className="w-5 h-5 mr-2 text-success" />
              Fertilization Program
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Organic Fertilizers:</p>
                <ul className="space-y-1">
                  {guide.fertilization.organic.map((fertilizer, idx) => (
                    <li key={idx} className="text-sm flex items-start">
                      <span className="w-1.5 h-1.5 bg-success rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {fertilizer}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Chemical Fertilizers:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground">Nitrogen (N)</p>
                    <p className="font-medium">{guide.fertilization.chemical.nitrogen}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground">Phosphorous (P)</p>
                    <p className="font-medium">{guide.fertilization.chemical.phosphorous}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground">Potassium (K)</p>
                    <p className="font-medium">{guide.fertilization.chemical.potassium}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Application Schedule:</p>
                <div className="space-y-2">
                  {guide.fertilization.schedule.map((schedule, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{schedule}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Protection Tab */}
        <TabsContent value="protection" className="space-y-4">
          <Card className="p-4 shadow-soft">
            <h3 className="font-semibold mb-3 flex items-center">
              <Bug className="w-5 h-5 mr-2 text-destructive" />
              Pest Management
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Common Pests:</p>
                <div className="flex flex-wrap gap-2">
                  {guide.pestManagement.commonPests.map((pest, idx) => (
                    <Badge key={idx} variant="destructive">{pest}</Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Chemical Control:</p>
                <div className="flex flex-wrap gap-2">
                  {guide.pestManagement.pesticides.map((pesticide, idx) => (
                    <Badge key={idx} variant="outline">{pesticide}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Natural Remedies:</p>
                <ul className="space-y-1">
                  {guide.pestManagement.naturalRemedies.map((remedy, idx) => (
                    <li key={idx} className="text-sm flex items-start">
                      <Shield className="w-4 h-4 text-success mt-0.5 mr-2 flex-shrink-0" />
                      {remedy}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-4 shadow-soft">
            <h3 className="font-semibold mb-3 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-warning" />
              Disease Management
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Common Diseases:</p>
                <div className="flex flex-wrap gap-2">
                  {guide.diseases.commonDiseases.map((disease, idx) => (
                    <Badge key={idx} variant="destructive">{disease}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Symptoms to Watch:</p>
                <ul className="space-y-1">
                  {guide.diseases.symptoms.map((symptom, idx) => (
                    <li key={idx} className="text-sm flex items-start">
                      <span className="w-1.5 h-1.5 bg-warning rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {symptom}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Treatment Options:</p>
                <ul className="space-y-1">
                  {guide.diseases.treatment.map((treatment, idx) => (
                    <li key={idx} className="text-sm flex items-start">
                      <span className="w-1.5 h-1.5 bg-info rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {treatment}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Prevention Measures:</p>
                <ul className="space-y-1">
                  {guide.diseases.prevention.map((prevention, idx) => (
                    <li key={idx} className="text-sm flex items-start">
                      <Shield className="w-4 h-4 text-success mt-0.5 mr-2 flex-shrink-0" />
                      {prevention}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};