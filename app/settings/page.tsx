"use client"

import { useState } from "react"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { Header } from "@/components/dashboard/Header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectItem } from "@/components/ui/select"
import { Settings, Bell, Shield, BarChart3, Save } from "lucide-react"

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    highRiskAlerts: true,
    scheduleAlerts: true,
    dailyReports: false,
  })

  const [riskThresholds, setRiskThresholds] = useState({
    low: 40,
    moderate: 70,
    high: 85,
  })

  const [updateFrequency, setUpdateFrequency] = useState("realtime")

  const handleSave = () => {
    // In real app, save to backend
    console.log("Settings saved", { notifications, riskThresholds, updateFrequency })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground mt-1">
                  Configure your analytics preferences and notification settings
                </p>
              </div>
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-[#FDB927]" />
                  Notifications
                </CardTitle>
                <CardDescription>
                  Manage how and when you receive alerts and updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-alerts">Email Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email notifications for important updates
                    </p>
                  </div>
                  <Switch
                    id="email-alerts"
                    checked={notifications.emailAlerts}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, emailAlerts: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="high-risk">High Risk Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when player risk scores exceed thresholds
                    </p>
                  </div>
                  <Switch
                    id="high-risk"
                    checked={notifications.highRiskAlerts}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, highRiskAlerts: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="schedule">Schedule Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Alerts for back-to-back games and schedule stress
                    </p>
                  </div>
                  <Switch
                    id="schedule"
                    checked={notifications.scheduleAlerts}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, scheduleAlerts: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="daily-reports">Daily Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive daily summary reports via email
                    </p>
                  </div>
                  <Switch
                    id="daily-reports"
                    checked={notifications.dailyReports}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, dailyReports: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Risk Thresholds */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-[#FDB927]" />
                  Risk Thresholds
                </CardTitle>
                <CardDescription>
                  Configure risk score thresholds for classification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Low Risk Threshold</Label>
                      <span className="text-sm font-semibold">{riskThresholds.low}%</span>
                    </div>
                    <Slider
                      value={[riskThresholds.low]}
                      onValueChange={([value]) =>
                        setRiskThresholds({ ...riskThresholds, low: value })
                      }
                      min={0}
                      max={50}
                      step={5}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Scores below this are considered low risk
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Moderate Risk Threshold</Label>
                      <span className="text-sm font-semibold">{riskThresholds.moderate}%</span>
                    </div>
                    <Slider
                      value={[riskThresholds.moderate]}
                      onValueChange={([value]) =>
                        setRiskThresholds({ ...riskThresholds, moderate: value })
                      }
                      min={riskThresholds.low}
                      max={85}
                      step={5}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Scores between low and this are moderate risk
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>High Risk Threshold</Label>
                      <span className="text-sm font-semibold">{riskThresholds.high}%</span>
                    </div>
                    <Slider
                      value={[riskThresholds.high]}
                      onValueChange={([value]) =>
                        setRiskThresholds({ ...riskThresholds, high: value })
                      }
                      min={riskThresholds.moderate}
                      max={100}
                      step={5}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Scores above this are considered high risk
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Update Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#FDB927]" />
                  Data Updates
                </CardTitle>
                <CardDescription>Configure how often data is refreshed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="update-frequency">Update Frequency</Label>
                  <Select
                    id="update-frequency"
                    value={updateFrequency}
                    onChange={(e) => setUpdateFrequency(e.target.value)}
                  >
                    <SelectItem value="realtime">Real-time</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose how frequently the dashboard updates with new data
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Team Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-[#FDB927]" />
                  Team Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Team</Label>
                  <Select defaultValue="lakers">
                    <SelectItem value="lakers">Los Angeles Lakers</SelectItem>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Season</Label>
                  <Select defaultValue="2023-24">
                    <SelectItem value="2023-24">2023-24 Season</SelectItem>
                    <SelectItem value="2022-23">2022-23 Season</SelectItem>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
